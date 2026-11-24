-- ============================================================
-- WEB BUILDER (CRM section "Web")
-- Run in the Supabase SQL Editor after schema.sql.
-- Safe to run again: it never deletes data.
--
-- Roles in a site: dueno (owner, web.id_dueno_fk), editor and lector
-- (rows in web_colaborador). Any active admin can see and edit every site
-- without being a collaborator. Limits: 3 editors counting the owner and
-- 6 people in total counting the owner; admins never count unless they own
-- the site. Tests: webs_prueba.sql.
-- ============================================================

-- A palette is an object whose six colours are all '#rrggbb' (they end up in CSS)
CREATE OR REPLACE FUNCTION paleta_valida(p JSONB)
RETURNS BOOLEAN AS $$
  SELECT jsonb_typeof(p) = 'object'
    AND (
      SELECT COUNT(*)
      FROM unnest(ARRAY['fondo', 'superficie', 'texto', 'texto_suave', 'primario', 'sobre_primario']) AS clave
      WHERE jsonb_typeof(p -> clave) = 'string'
        AND (p ->> clave) ~ '^#[0-9a-fA-F]{6}$'
    ) = 6;
$$ LANGUAGE sql IMMUTABLE SET search_path = public;

CREATE TABLE IF NOT EXISTS web (
  id_web UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(120) NOT NULL,
  plantilla VARCHAR(20) NOT NULL
    CHECK (plantilla IN ('negocio', 'portfolio', 'evento', 'vacia')),
  paleta JSONB NOT NULL,
  ajustes JSONB NOT NULL
    DEFAULT '{"titulo": "", "logo": null, "pie": "", "descripcion": ""}'::JSONB
    CHECK (jsonb_typeof(ajustes) = 'object'),
  id_dueno_fk UUID NOT NULL DEFAULT mi_empleado() REFERENCES empleado(id_empleado),
  creada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizada TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS web_bloque (
  id_bloque UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_web_fk UUID NOT NULL REFERENCES web(id_web) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN (
    'cabecera', 'texto', 'servicios', 'galeria', 'equipo',
    'testimonios', 'preguntas', 'llamada', 'contacto'
  )),
  orden DOUBLE PRECISION NOT NULL,     -- midpoint between neighbours (lib/web/orden.ts)
  contenido JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(contenido) = 'object'),
  actualizado TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_por UUID REFERENCES empleado(id_empleado) ON DELETE SET NULL
);

-- The owner is never a row here: ownership is web.id_dueno_fk
CREATE TABLE IF NOT EXISTS web_colaborador (
  id_web_fk UUID NOT NULL REFERENCES web(id_web) ON DELETE CASCADE,
  id_empleado_fk UUID NOT NULL REFERENCES empleado(id_empleado) ON DELETE CASCADE,
  rol VARCHAR(10) NOT NULL CHECK (rol IN ('editor', 'lector')),
  PRIMARY KEY (id_web_fk, id_empleado_fk)
);

-- Named palette check, replaced on every run (web_paleta_check is the older
-- inline check that only looked at the keys)
ALTER TABLE web DROP CONSTRAINT IF EXISTS web_paleta_check;
ALTER TABLE web DROP CONSTRAINT IF EXISTS web_paleta_colores;
ALTER TABLE web ADD CONSTRAINT web_paleta_colores CHECK (paleta_valida(paleta));

CREATE INDEX IF NOT EXISTS web_dueno_idx ON web (id_dueno_fk);
CREATE INDEX IF NOT EXISTS web_bloque_web_idx ON web_bloque (id_web_fk, orden);
CREATE INDEX IF NOT EXISTS web_colaborador_empleado_idx ON web_colaborador (id_empleado_fk);

-- ============================================================
-- ROLE OF THE SIGNED-IN EMPLOYEE IN A SITE
-- 'dueno' | 'admin' | 'editor' | 'lector' | NULL (no access or no such site).
-- The owner wins over admin. SECURITY DEFINER so the policies that call it
-- do not recurse into the RLS of web and web_colaborador.
-- ============================================================

CREATE OR REPLACE FUNCTION rol_en_web(p_web UUID)
RETURNS TEXT AS $$
  SELECT CASE
    WHEN w.id_dueno_fk = mi_empleado() THEN 'dueno'
    WHEN es_admin() THEN 'admin'
    ELSE (
      SELECT c.rol::TEXT FROM public.web_colaborador c
      WHERE c.id_web_fk = w.id_web AND c.id_empleado_fk = mi_empleado()
    )
  END
  FROM public.web w
  WHERE w.id_web = p_web;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Site id from a Storage path '<id_web>/<file>' (NULL when it is not a uuid)
CREATE OR REPLACE FUNCTION web_de_ruta(p_ruta TEXT)
RETURNS UUID AS $$
  SELECT CASE
    WHEN (storage.foldername(p_ruta))[1]
      ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN ((storage.foldername(p_ruta))[1])::UUID
  END;
$$ LANGUAGE sql STABLE SET search_path = public;

-- ============================================================
-- TRIGGERS: timestamps and author of the last change
-- ============================================================

CREATE OR REPLACE FUNCTION tocar_web()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizada := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_tocar_web
BEFORE UPDATE ON web
FOR EACH ROW EXECUTE FUNCTION tocar_web();

CREATE OR REPLACE FUNCTION tocar_web_bloque()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado := NOW();
  NEW.actualizado_por := mi_empleado();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_tocar_web_bloque
BEFORE INSERT OR UPDATE ON web_bloque
FOR EACH ROW EXECUTE FUNCTION tocar_web_bloque();

-- A block change also marks its site as changed ("Mis webs" shows it).
-- At most once a minute: block saves arrive about every second while someone
-- types, and each web UPDATE locks the row and reaches every client by Realtime.
-- SECURITY DEFINER: editors cannot update web.actualizada themselves.
CREATE OR REPLACE FUNCTION tocar_web_de_bloque()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE web SET actualizada = NOW()
  WHERE id_web = CASE WHEN TG_OP = 'DELETE' THEN OLD.id_web_fk ELSE NEW.id_web_fk END
    AND actualizada < NOW() - INTERVAL '1 minute';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER trigger_tocar_web_de_bloque
AFTER INSERT OR UPDATE OR DELETE ON web_bloque
FOR EACH ROW EXECUTE FUNCTION tocar_web_de_bloque();

-- ============================================================
-- TRIGGER: collaborator rules and limits
-- Not the owner, not an admin, only active employees, at most 2 editor rows
-- (3 editors counting the owner) and 5 rows (6 people counting the owner).
-- Mirrored for the UI in crm/lib/web/limites.ts.
-- ============================================================

CREATE OR REPLACE FUNCTION comprobar_colaborador()
RETURNS TRIGGER AS $$
DECLARE
  v_dueno UUID;
  v_activo BOOLEAN;
  v_rol TEXT;
  v_editores INT;
  v_filas INT;
BEGIN
  -- Lock the site so two simultaneous invitations cannot both pass the limits
  SELECT id_dueno_fk INTO v_dueno FROM web WHERE id_web = NEW.id_web_fk FOR UPDATE;

  IF NEW.id_empleado_fk = v_dueno THEN
    RAISE EXCEPTION 'El dueño de la web no puede ser colaborador';
  END IF;

  SELECT activo, rol INTO v_activo, v_rol FROM empleado WHERE id_empleado = NEW.id_empleado_fk;
  IF NOT COALESCE(v_activo, FALSE) THEN
    RAISE EXCEPTION 'Solo se pueden añadir empleados activos';
  END IF;
  IF v_rol = 'admin' THEN
    RAISE EXCEPTION 'Los administradores ya pueden ver y editar todas las webs';
  END IF;

  -- Count the other rows of the site. NEW's own key is always left out: an
  -- INSERT ... ON CONFLICT DO UPDATE (a role change from the editor) runs this
  -- BEFORE INSERT trigger with the existing row still in place. On an UPDATE
  -- that changes the key, the old row is left out too.
  SELECT COUNT(*) FILTER (WHERE rol = 'editor'), COUNT(*)
  INTO v_editores, v_filas
  FROM web_colaborador
  WHERE id_web_fk = NEW.id_web_fk
    AND id_empleado_fk <> NEW.id_empleado_fk
    AND NOT (TG_OP = 'UPDATE' AND id_web_fk = OLD.id_web_fk AND id_empleado_fk = OLD.id_empleado_fk);

  IF NEW.rol = 'editor' AND v_editores >= 2 THEN
    RAISE EXCEPTION 'Ya hay 3 editores contando al dueño';
  END IF;
  IF v_filas >= 5 THEN
    RAISE EXCEPTION 'Máximo 6 personas en una web';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER trigger_comprobar_colaborador
BEFORE INSERT OR UPDATE ON web_colaborador
FOR EACH ROW EXECUTE FUNCTION comprobar_colaborador();

-- ============================================================
-- RPC: change the owner of a site (admins only)
-- The new owner must be active; their collaborator row, if any, is removed.
-- The previous owner simply loses access (an admin can add them back).
-- ============================================================

CREATE OR REPLACE FUNCTION cambiar_dueno(p_web UUID, p_empleado UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT es_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar el dueño de una web';
  END IF;
  -- Lock the site so a simultaneous invitation of the new owner cannot slip in
  PERFORM 1 FROM web WHERE id_web = p_web FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La web no existe';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM empleado WHERE id_empleado = p_empleado AND activo) THEN
    RAISE EXCEPTION 'El nuevo dueño tiene que ser un empleado activo';
  END IF;

  DELETE FROM web_colaborador WHERE id_web_fk = p_web AND id_empleado_fk = p_empleado;
  UPDATE web SET id_dueno_fk = p_empleado WHERE id_web = p_web;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- SECURITY (RLS). "Manage" = owner or admin.
-- ============================================================

ALTER TABLE web ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_bloque ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_colaborador ENABLE ROW LEVEL SECURITY;

-- Editors change name, palette and settings only. The owner changes through
-- cambiar_dueno(); the timestamps are kept by the triggers.
REVOKE UPDATE ON web FROM anon, authenticated;
GRANT UPDATE (nombre, paleta, ajustes) ON web TO authenticated;

DROP POLICY IF EXISTS "web_ver" ON web;
DROP POLICY IF EXISTS "web_crear" ON web;
DROP POLICY IF EXISTS "web_editar" ON web;
DROP POLICY IF EXISTS "web_borrar" ON web;

-- The owner check on the row itself lets INSERT ... RETURNING see the new site
-- (rol_en_web() cannot see a row inserted by the same statement).
CREATE POLICY "web_ver" ON web FOR SELECT TO authenticated
  USING (id_dueno_fk = mi_empleado() OR rol_en_web(id_web) IS NOT NULL);
CREATE POLICY "web_crear" ON web FOR INSERT TO authenticated
  WITH CHECK (id_dueno_fk = mi_empleado());
CREATE POLICY "web_editar" ON web FOR UPDATE TO authenticated
  USING (rol_en_web(id_web) IN ('dueno', 'editor', 'admin'))
  WITH CHECK (rol_en_web(id_web) IN ('dueno', 'editor', 'admin'));
CREATE POLICY "web_borrar" ON web FOR DELETE TO authenticated
  USING (rol_en_web(id_web) IN ('dueno', 'admin'));

DROP POLICY IF EXISTS "web_bloque_ver" ON web_bloque;
DROP POLICY IF EXISTS "web_bloque_editar" ON web_bloque;

CREATE POLICY "web_bloque_ver" ON web_bloque FOR SELECT TO authenticated
  USING (rol_en_web(id_web_fk) IS NOT NULL);
CREATE POLICY "web_bloque_editar" ON web_bloque FOR ALL TO authenticated
  USING (rol_en_web(id_web_fk) IN ('dueno', 'editor', 'admin'))
  WITH CHECK (rol_en_web(id_web_fk) IN ('dueno', 'editor', 'admin'));

DROP POLICY IF EXISTS "web_colaborador_ver" ON web_colaborador;
DROP POLICY IF EXISTS "web_colaborador_gestionar" ON web_colaborador;

CREATE POLICY "web_colaborador_ver" ON web_colaborador FOR SELECT TO authenticated
  USING (rol_en_web(id_web_fk) IS NOT NULL);
CREATE POLICY "web_colaborador_gestionar" ON web_colaborador FOR ALL TO authenticated
  USING (rol_en_web(id_web_fk) IN ('dueno', 'admin'))
  WITH CHECK (rol_en_web(id_web_fk) IN ('dueno', 'admin'));

-- ============================================================
-- STORAGE: private bucket 'webs', path <id_web>/<uuid>.<ext>
-- JPG, PNG or WEBP up to 5 MB. Members read (the editor uses signed URLs);
-- owner, editors and admins upload, replace and delete.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('webs', 'webs', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "webs_leer" ON storage.objects;
DROP POLICY IF EXISTS "webs_subir" ON storage.objects;
DROP POLICY IF EXISTS "webs_cambiar" ON storage.objects;
DROP POLICY IF EXISTS "webs_borrar" ON storage.objects;

CREATE POLICY "webs_leer" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'webs' AND rol_en_web(web_de_ruta(name)) IS NOT NULL);
CREATE POLICY "webs_subir" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'webs' AND rol_en_web(web_de_ruta(name)) IN ('dueno', 'editor', 'admin'));
CREATE POLICY "webs_cambiar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'webs' AND rol_en_web(web_de_ruta(name)) IN ('dueno', 'editor', 'admin'))
  WITH CHECK (bucket_id = 'webs' AND rol_en_web(web_de_ruta(name)) IN ('dueno', 'editor', 'admin'));
CREATE POLICY "webs_borrar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'webs' AND rol_en_web(web_de_ruta(name)) IN ('dueno', 'editor', 'admin'));

-- ============================================================
-- Supabase Realtime: structural changes and people reach every open editor
-- ============================================================

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE web;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE web_bloque;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE web_colaborador;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Realtime channel 'web:<id_web>' (private): presence and typing broadcast.
-- Members join and track presence; only owner, editors and admins broadcast.
-- ============================================================

-- Site id from a Realtime topic 'web:<id_web>' (NULL for any other topic)
CREATE OR REPLACE FUNCTION web_de_topic(p_topic TEXT)
RETURNS UUID AS $$
  SELECT CASE
    WHEN p_topic ~* '^web:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN substr(p_topic, 5)::UUID
  END;
$$ LANGUAGE sql IMMUTABLE SET search_path = public;

DROP POLICY IF EXISTS "webs_canal_leer" ON realtime.messages;
DROP POLICY IF EXISTS "webs_canal_enviar" ON realtime.messages;

CREATE POLICY "webs_canal_leer" ON realtime.messages FOR SELECT TO authenticated
  USING (rol_en_web(web_de_topic(realtime.topic())) IS NOT NULL);
CREATE POLICY "webs_canal_enviar" ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    (extension = 'presence' AND rol_en_web(web_de_topic(realtime.topic())) IS NOT NULL)
    OR (extension = 'broadcast' AND rol_en_web(web_de_topic(realtime.topic())) IN ('dueno', 'editor', 'admin'))
  );
