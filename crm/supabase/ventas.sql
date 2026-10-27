-- ============================================================
-- CRM MI MASCOTA - Módulo Ventas (presupuestos y pedidos)
-- Ejecutar en Supabase SQL Editor DESPUÉS de schema.sql.
-- No borra nada: amplía el catálogo `servicio` y crea `venta` y
-- `linea_venta`. Se puede volver a ejecutar las veces que haga falta.
-- Para probarlo primero sin guardar nada, cambia el COMMIT del final
-- por ROLLBACK, ejecútalo y, si no da errores, vuelve a poner COMMIT.
-- Después, si quieres datos de prueba, ejecuta ventas_datos_ejemplo.sql
-- ============================================================

BEGIN;

-- ============================================================
-- CATÁLOGO: productos y servicios
-- ============================================================
-- precio_base es el precio SIN IVA; iva es el porcentaje que se aplica.
-- En España los servicios veterinarios van al 21 % y los medicamentos
-- veterinarios al 10 %.

ALTER TABLE servicio ADD COLUMN IF NOT EXISTS tipo VARCHAR(10) NOT NULL DEFAULT 'servicio'
  CHECK (tipo IN ('servicio', 'producto'));
ALTER TABLE servicio ADD COLUMN IF NOT EXISTS categoria VARCHAR(60);   -- Consultas, Vacunas, Cirugía, Pruebas…
ALTER TABLE servicio ADD COLUMN IF NOT EXISTS iva SMALLINT NOT NULL DEFAULT 21
  CHECK (iva IN (0, 4, 10, 21));
ALTER TABLE servicio ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE servicio ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- Categoría de los servicios que crea schema.sql (solo si aún no la tienen,
-- para no pisar lo que se haya cambiado desde el CRM)
UPDATE servicio s
SET categoria = c.categoria, tipo = 'servicio', descripcion = COALESCE(s.descripcion, c.descripcion)
FROM (VALUES
  ('Consulta general', 'Consultas', 'Exploración completa y diagnóstico.'),
  ('Vacunación', 'Vacunas', 'Vacuna según el calendario de la especie.'),
  ('Desparasitación', 'Consultas', 'Desparasitación interna y externa en la clínica.'),
  ('Cirugía', 'Cirugía', 'Intervención quirúrgica con anestesia general.'),
  ('Esterilización', 'Cirugía', 'Castración u ovariohisterectomía.'),
  ('Análisis y pruebas', 'Pruebas', 'Análisis de sangre, orina u otras pruebas.'),
  ('Peluquería', 'Peluquería', 'Baño, corte y secado.'),
  ('Urgencias', 'Consultas', 'Atención urgente fuera de cita.'),
  ('Revisión de granja', 'Granjas', 'Visita a la explotación y revisión del ganado.'),
  ('Chip e identificación', 'Identificación', 'Microchip y alta en el registro.')
) AS c(nombre, categoria, descripcion)
WHERE s.nombre = c.nombre AND s.categoria IS NULL;

-- Los permisos de `servicio` no cambian: servicio_select (lo lee todo el
-- equipo) y servicio_admin (lo cambia un administrador) de schema.sql.

-- ============================================================
-- VENTAS: presupuesto que se convierte en pedido
-- ============================================================
-- Estados: presupuesto → enviado → pedido; cualquiera de ellos → cancelado;
-- cancelado → presupuesto. El número (V-0012) lo da la base de datos.
-- Los importes los calcula la base de datos a partir de las líneas.

CREATE TABLE IF NOT EXISTS venta (
  id_venta UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT GENERATED ALWAYS AS IDENTITY UNIQUE,
  estado VARCHAR(20) NOT NULL DEFAULT 'presupuesto'
    CHECK (estado IN ('presupuesto', 'enviado', 'pedido', 'cancelado')),
  -- El cliente es una empresa o un particular (uno de los dos, nunca ambos)
  id_particular_fk UUID REFERENCES particular(id_particular) ON DELETE RESTRICT,
  id_empresa_fk UUID REFERENCES empresa(id_empresa) ON DELETE RESTRICT,
  id_animal_fk UUID REFERENCES animal(id_animal) ON DELETE SET NULL,
  id_oportunidad_fk UUID REFERENCES oportunidad(id_oportunidad) ON DELETE SET NULL,
  id_responsable_fk UUID REFERENCES empleado(id_empleado) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_validez DATE NOT NULL DEFAULT CURRENT_DATE + 30,
  condiciones_pago VARCHAR(20) NOT NULL DEFAULT 'contado'
    CHECK (condiciones_pago IN ('contado', '15_dias', '30_dias', '60_dias')),
  notas TEXT,
  base_imponible NUMERIC(12,2) NOT NULL DEFAULT 0,
  importe_iva NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  fecha_envio TIMESTAMPTZ,
  fecha_confirmacion TIMESTAMPTZ,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT venta_un_cliente CHECK ((id_particular_fk IS NULL) <> (id_empresa_fk IS NULL)),
  CHECK (fecha_validez >= fecha)
);

CREATE INDEX IF NOT EXISTS venta_estado_idx ON venta (estado);
CREATE INDEX IF NOT EXISTS venta_oportunidad_idx ON venta (id_oportunidad_fk);
CREATE INDEX IF NOT EXISTS venta_particular_idx ON venta (id_particular_fk);
CREATE INDEX IF NOT EXISTS venta_empresa_idx ON venta (id_empresa_fk);

-- Una línea puede ser del catálogo (id_servicio_fk) o texto libre (sin servicio)
CREATE TABLE IF NOT EXISTS linea_venta (
  id_linea_venta UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_venta_fk UUID NOT NULL REFERENCES venta(id_venta) ON DELETE CASCADE,
  id_servicio_fk UUID REFERENCES servicio(id_servicio) ON DELETE RESTRICT,
  descripcion VARCHAR(300) NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (precio_unitario >= 0),  -- sin IVA
  descuento NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (descuento BETWEEN 0 AND 100),  -- %
  iva SMALLINT NOT NULL DEFAULT 21 CHECK (iva IN (0, 4, 10, 21)),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,  -- sin IVA y con el descuento (lo calcula un trigger)
  orden SMALLINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS linea_venta_venta_idx ON linea_venta (id_venta_fk);

-- ============================================================
-- FUNCIONES: número de venta e importes en formato español
-- ============================================================

-- 12 → 'V-0012'
CREATE OR REPLACE FUNCTION codigo_venta(n INT)
RETURNS TEXT AS $$ SELECT 'V-' || LPAD(n::TEXT, 4, '0') $$ LANGUAGE sql IMMUTABLE;

-- 1234.5 → '1.234,50 €' (en TO_CHAR ',' y '.' no dependen del idioma del
-- servidor; después se intercambian para dejarlos como en España)
CREATE OR REPLACE FUNCTION formato_eur(p_importe NUMERIC)
RETURNS TEXT AS $$
  SELECT TRANSLATE(TO_CHAR(p_importe, 'FM9,999,999,990.00'), ',.', '.,') || ' €'
$$ LANGUAGE sql IMMUTABLE;

-- ============================================================
-- TRIGGER: líneas (solo se cambian en presupuestos y calculan su subtotal)
-- ============================================================
-- Las líneas solo se pueden añadir, cambiar o quitar mientras la venta
-- está en 'presupuesto' o 'enviado'.
-- Excepción: al borrar una venta, sus líneas se borran en cascada. Cuando
-- este trigger se ejecuta en ese borrado la venta ya no existe (el borrado
-- en cascada corre después de borrar la venta), así que si no se encuentra
-- la venta se deja pasar. Es más fiable que mirar pg_trigger_depth().

CREATE OR REPLACE FUNCTION preparar_linea_venta()
RETURNS TRIGGER AS $$
DECLARE
  v_estado TEXT;
  v_id UUID;
  v_ventas UUID[];
BEGIN
  -- Ventas afectadas (en un UPDATE, la de antes y la de después)
  IF TG_OP = 'INSERT' THEN
    v_ventas := ARRAY[NEW.id_venta_fk];
  ELSIF TG_OP = 'DELETE' THEN
    v_ventas := ARRAY[OLD.id_venta_fk];
  ELSE
    v_ventas := ARRAY[OLD.id_venta_fk, NEW.id_venta_fk];
  END IF;

  FOREACH v_id IN ARRAY v_ventas LOOP
    SELECT estado INTO v_estado FROM venta WHERE id_venta = v_id;
    IF FOUND AND v_estado = 'pedido' THEN
      RAISE EXCEPTION 'Este pedido ya está confirmado y sus líneas no se pueden cambiar: cancélalo y vuelve a ponerlo como presupuesto';
    ELSIF FOUND AND v_estado = 'cancelado' THEN
      RAISE EXCEPTION 'Este presupuesto está cancelado y sus líneas no se pueden cambiar: vuelve a ponerlo como presupuesto';
    END IF;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  NEW.subtotal := ROUND(NEW.cantidad * NEW.precio_unitario * (1 - NEW.descuento / 100), 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_preparar_linea_venta ON linea_venta;
CREATE TRIGGER trigger_preparar_linea_venta
BEFORE INSERT OR UPDATE OR DELETE ON linea_venta
FOR EACH ROW EXECUTE FUNCTION preparar_linea_venta();

-- ============================================================
-- TRIGGER: preparar venta (estados, fechas, animal del cliente e importes)
-- ============================================================
-- - Una venta nueva siempre empieza como 'presupuesto'.
-- - Cambios de estado permitidos: presupuesto → enviado, presupuesto → pedido,
--   enviado → pedido, presupuesto/enviado → cancelado, pedido → cancelado
--   (solo administradores) y cancelado → presupuesto.
-- - fecha_envio y fecha_confirmacion se ponen solas (NOW()) al pasar a
--   'enviado' o 'pedido', salvo que el mismo UPDATE traiga otra fecha
--   distinta de la que había (así los datos de ejemplo guardan fechas pasadas).
-- - Un pedido confirmado o cancelado está cerrado: solo cambian las notas.
-- - Los importes se recalculan siempre a partir de las líneas, así que no
--   se pueden poner a mano.

CREATE OR REPLACE FUNCTION preparar_venta()
RETURNS TRIGGER AS $$
DECLARE
  v_validar_animal BOOLEAN;
  v_base NUMERIC(12,2);
  v_iva NUMERIC(12,2);
BEGIN
  NEW.fecha_actualizacion := NOW();

  IF TG_OP = 'INSERT' THEN
    IF NEW.estado <> 'presupuesto' THEN
      RAISE EXCEPTION 'Una venta nueva empieza siempre como presupuesto: créala así y después envíala o confírmala';
    END IF;
    NEW.fecha_envio := NULL;
    NEW.fecha_confirmacion := NULL;
    v_validar_animal := TRUE;

  ELSIF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF (OLD.estado || '>' || NEW.estado) NOT IN ('presupuesto>enviado', 'presupuesto>pedido',
        'enviado>pedido', 'presupuesto>cancelado', 'enviado>cancelado', 'pedido>cancelado',
        'cancelado>presupuesto') THEN
      RAISE EXCEPTION 'Una venta en estado "%" no puede pasar a "%": para volver a editarla, cancélala y después ponla de nuevo como presupuesto',
        OLD.estado, NEW.estado;
    END IF;
    -- Desde el SQL Editor o con la clave de servicio no hay usuario con sesión
    -- (es_admin() da FALSE); en ese caso se permite, porque no lo hace un trabajador
    IF OLD.estado = 'pedido' AND NOT (es_admin() OR COALESCE(auth.jwt() ->> 'role', '') <> 'authenticated') THEN
      RAISE EXCEPTION 'Solo un administrador puede cancelar un pedido confirmado: pídeselo a un administrador';
    END IF;
    IF NEW.estado = 'pedido' AND NOT EXISTS (SELECT 1 FROM linea_venta WHERE id_venta_fk = NEW.id_venta) THEN
      RAISE EXCEPTION 'Añade al menos una línea antes de confirmar el pedido';
    END IF;
    IF NEW.estado = 'enviado' AND NEW.fecha_envio IS NOT DISTINCT FROM OLD.fecha_envio THEN
      NEW.fecha_envio := NOW();
    END IF;
    IF NEW.estado = 'pedido' AND NEW.fecha_confirmacion IS NOT DISTINCT FROM OLD.fecha_confirmacion THEN
      NEW.fecha_confirmacion := NOW();
    END IF;
    IF NEW.estado = 'presupuesto' THEN
      NEW.fecha_envio := NULL;
      NEW.fecha_confirmacion := NULL;
    END IF;

  ELSIF OLD.estado IN ('pedido', 'cancelado') THEN
    -- Cerrado: solo pueden cambiar las notas (y los importes y la fecha de
    -- actualización, que pone la base de datos). Animal, oportunidad y
    -- responsable pueden quedarse en blanco porque se ponen a NULL solos
    -- cuando se borra el registro al que apuntan (ON DELETE SET NULL).
    IF (NEW.id_venta, NEW.numero, NEW.id_particular_fk, NEW.id_empresa_fk, NEW.fecha,
        NEW.fecha_validez, NEW.condiciones_pago, NEW.fecha_envio, NEW.fecha_confirmacion,
        NEW.fecha_creacion)
       IS DISTINCT FROM
       (OLD.id_venta, OLD.numero, OLD.id_particular_fk, OLD.id_empresa_fk, OLD.fecha,
        OLD.fecha_validez, OLD.condiciones_pago, OLD.fecha_envio, OLD.fecha_confirmacion,
        OLD.fecha_creacion)
       OR (NEW.id_animal_fk IS NOT NULL AND NEW.id_animal_fk IS DISTINCT FROM OLD.id_animal_fk)
       OR (NEW.id_oportunidad_fk IS NOT NULL AND NEW.id_oportunidad_fk IS DISTINCT FROM OLD.id_oportunidad_fk)
       OR (NEW.id_responsable_fk IS NOT NULL AND NEW.id_responsable_fk IS DISTINCT FROM OLD.id_responsable_fk) THEN
      RAISE EXCEPTION 'Este pedido está cerrado: solo se pueden cambiar las notas';
    END IF;
  END IF;

  -- El animal tiene que ser del cliente (solo se comprueba si cambia algo de
  -- esto, para no bloquear la venta si el animal cambia de dueño más tarde)
  IF TG_OP = 'UPDATE' THEN
    v_validar_animal := NEW.id_animal_fk IS DISTINCT FROM OLD.id_animal_fk
      OR NEW.id_particular_fk IS DISTINCT FROM OLD.id_particular_fk
      OR NEW.id_empresa_fk IS DISTINCT FROM OLD.id_empresa_fk;
  END IF;
  IF v_validar_animal AND NEW.id_animal_fk IS NOT NULL AND NOT (
       (NEW.id_empresa_fk IS NOT NULL AND EXISTS (
          SELECT 1 FROM animal WHERE id_animal = NEW.id_animal_fk AND id_empresa_fk = NEW.id_empresa_fk))
    OR (NEW.id_particular_fk IS NOT NULL AND EXISTS (
          SELECT 1 FROM animal_particular
          WHERE id_animal_fk = NEW.id_animal_fk AND id_particular_fk = NEW.id_particular_fk))) THEN
    RAISE EXCEPTION 'Ese animal no es de este cliente: elige uno de sus animales o déjalo en blanco';
  END IF;

  -- Importes a partir de las líneas (el IVA se redondea línea a línea)
  SELECT COALESCE(SUM(subtotal), 0), COALESCE(SUM(ROUND(subtotal * iva / 100, 2)), 0)
  INTO v_base, v_iva
  FROM linea_venta WHERE id_venta_fk = NEW.id_venta;
  NEW.base_imponible := v_base;
  NEW.importe_iva := v_iva;
  NEW.total := v_base + v_iva;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_preparar_venta ON venta;
CREATE TRIGGER trigger_preparar_venta
BEFORE INSERT OR UPDATE ON venta
FOR EACH ROW EXECUTE FUNCTION preparar_venta();

-- ============================================================
-- TRIGGER: recalcular los importes de la venta al cambiar sus líneas
-- ============================================================
-- Basta con tocar la venta: preparar_venta() suma las líneas. Si la venta
-- se está borrando, el UPDATE no encuentra la fila y no hace nada.

CREATE OR REPLACE FUNCTION recalcular_venta(p_id UUID)
RETURNS VOID AS $$
  UPDATE public.venta SET fecha_actualizacion = NOW() WHERE id_venta = p_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION recalcular_venta_linea()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM recalcular_venta(NEW.id_venta_fk);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM recalcular_venta(OLD.id_venta_fk);
  ELSE
    PERFORM recalcular_venta(NEW.id_venta_fk);
    IF OLD.id_venta_fk IS DISTINCT FROM NEW.id_venta_fk THEN
      PERFORM recalcular_venta(OLD.id_venta_fk);
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_recalcular_venta ON linea_venta;
CREATE TRIGGER trigger_recalcular_venta
AFTER INSERT OR UPDATE OR DELETE ON linea_venta
FOR EACH ROW EXECUTE FUNCTION recalcular_venta_linea();

-- ============================================================
-- TRIGGER: historial de la oportunidad vinculada a la venta
-- ============================================================
-- Apunta en la actividad de la oportunidad cada paso de la venta y, al
-- enviar el presupuesto, pasa la oportunidad a 'presupuesto' si estaba en
-- 'nuevo' o 'contactado' (ese cambio lo apunta registrar_actividad()).

CREATE OR REPLACE FUNCTION ventas_a_oportunidad()
RETURNS TRIGGER AS $$
DECLARE
  v_codigo TEXT := codigo_venta(NEW.numero);
  v_texto TEXT;
  v_enviado BOOLEAN := FALSE;
BEGIN
  IF NEW.id_oportunidad_fk IS NULL THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_texto := 'Presupuesto ' || v_codigo || ' creado';
  ELSIF NEW.estado IS DISTINCT FROM OLD.estado THEN
    v_texto := CASE NEW.estado
      WHEN 'enviado' THEN 'Presupuesto ' || v_codigo || ' enviado'
      WHEN 'pedido' THEN 'Pedido ' || v_codigo || ' confirmado (' || formato_eur(NEW.total) || ')'
      WHEN 'cancelado' THEN CASE WHEN OLD.estado = 'pedido' THEN 'Pedido ' ELSE 'Presupuesto ' END
                            || v_codigo || ' cancelado'
      WHEN 'presupuesto' THEN v_codigo || ' vuelve a presupuesto'
    END;
    v_enviado := NEW.estado = 'enviado';
  ELSIF NEW.id_oportunidad_fk IS DISTINCT FROM OLD.id_oportunidad_fk THEN
    v_texto := 'Presupuesto ' || v_codigo || ' vinculado a esta oportunidad';
  END IF;

  IF v_texto IS NOT NULL THEN
    INSERT INTO actividad (id_oportunidad_fk, id_empleado_fk, tipo, descripcion)
    VALUES (NEW.id_oportunidad_fk, mi_empleado(), 'sistema', v_texto);
  END IF;

  IF v_enviado THEN
    UPDATE oportunidad SET estado = 'presupuesto'
    WHERE id_oportunidad = NEW.id_oportunidad_fk AND estado IN ('nuevo', 'contactado');
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_ventas_a_oportunidad ON venta;
CREATE TRIGGER trigger_ventas_a_oportunidad
AFTER INSERT OR UPDATE ON venta
FOR EACH ROW EXECUTE FUNCTION ventas_a_oportunidad();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Todo el equipo hace presupuestos y pedidos; borrar solo un administrador
-- y solo presupuestos o ventas canceladas (nunca un pedido confirmado).
-- Las líneas no llevan más reglas: el trigger preparar_linea_venta() impide
-- cambiarlas cuando la venta ya no es un presupuesto.

ALTER TABLE venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE linea_venta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venta_select" ON venta;
DROP POLICY IF EXISTS "venta_insert" ON venta;
DROP POLICY IF EXISTS "venta_update" ON venta;
DROP POLICY IF EXISTS "venta_delete" ON venta;
DROP POLICY IF EXISTS "linea_venta_all" ON linea_venta;

CREATE POLICY "venta_select" ON venta FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "venta_insert" ON venta FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "venta_update" ON venta FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "venta_delete" ON venta FOR DELETE TO authenticated
  USING (es_admin() AND estado IN ('presupuesto', 'cancelado'));

CREATE POLICY "linea_venta_all" ON linea_venta FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

COMMIT;
