-- ============================================================
-- CHECKS FOR webs.sql (roles, limits, RLS, cambiar_dueno, timestamps)
-- This file only holds the checks. Run it in the Supabase SQL Editor wrapped
-- in one transaction together with webs.sql, so nothing is kept:
--
--   BEGIN;
--   <contents of webs.sql>
--   <contents of this file>
--   ROLLBACK;
--
-- Expected: it reaches the end without an exception (the last statement
-- returns 'webs_prueba: OK'). The first failed check raises an exception
-- whose message starts with 'FALLO'.
--
-- It creates its own employees (prueba.*@test.local) and impersonates them
-- with SET LOCAL ROLE authenticated + request.jwt.claims. Ids are kept in
-- transaction-local settings (current_setting('prueba.<name>')).
-- ============================================================

-- ------------------------------------------------------------
-- Setup (as postgres): test employees
-- ------------------------------------------------------------
RESET ROLE;

INSERT INTO empleado (nombre, correo, puesto, rol, activo) VALUES
  ('Dueño', 'prueba.dueno@test.local', 'Prueba', 'empleado', TRUE),
  ('Editor 1', 'prueba.editor1@test.local', 'Prueba', 'empleado', TRUE),
  ('Editor 2', 'prueba.editor2@test.local', 'Prueba', 'empleado', TRUE),
  ('Editor 3', 'prueba.editor3@test.local', 'Prueba', 'empleado', TRUE),
  ('Lector 1', 'prueba.lector1@test.local', 'Prueba', 'empleado', TRUE),
  ('Lector 2', 'prueba.lector2@test.local', 'Prueba', 'empleado', TRUE),
  ('Lector 3', 'prueba.lector3@test.local', 'Prueba', 'empleado', TRUE),
  ('Otro', 'prueba.otro@test.local', 'Prueba', 'empleado', TRUE),
  ('Admin', 'prueba.admin@test.local', 'Prueba', 'admin', TRUE),
  ('Admin 2', 'prueba.admin2@test.local', 'Prueba', 'admin', TRUE),
  ('Inactivo', 'prueba.inactivo@test.local', 'Prueba', 'empleado', FALSE);

-- prueba.dueno, prueba.editor1, ... -> id_empleado
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id_empleado, correo FROM empleado WHERE correo LIKE 'prueba.%@test.local' LOOP
    PERFORM set_config(split_part(r.correo, '@', 1), r.id_empleado::TEXT, TRUE);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 1. The owner creates a site (INSERT ... RETURNING must see it) and a block
-- ------------------------------------------------------------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.dueno@test.local', 'role', 'authenticated')::TEXT, TRUE);

DO $$
DECLARE v_web UUID; v_bloque UUID; v_por UUID;
BEGIN
  INSERT INTO web (nombre, plantilla, paleta)
  VALUES ('Web de prueba', 'negocio',
    '{"fondo":"#ffffff","superficie":"#f5f5f5","texto":"#111111","texto_suave":"#555555","primario":"#000000","sobre_primario":"#ffffff"}')
  RETURNING id_web INTO v_web;
  IF v_web IS NULL THEN RAISE EXCEPTION 'FALLO 1: the owner did not get the new site back'; END IF;
  PERFORM set_config('prueba.web', v_web::TEXT, TRUE);

  IF (SELECT id_dueno_fk FROM web WHERE id_web = v_web) <> current_setting('prueba.dueno')::UUID THEN
    RAISE EXCEPTION 'FALLO 1: id_dueno_fk should default to the creator';
  END IF;
  IF rol_en_web(v_web) IS DISTINCT FROM 'dueno' THEN
    RAISE EXCEPTION 'FALLO 1: rol_en_web should be dueno, got %', rol_en_web(v_web);
  END IF;

  INSERT INTO web_bloque (id_web_fk, tipo, orden, contenido)
  VALUES (v_web, 'texto', 1000, '{"titulo":"Hola"}')
  RETURNING id_bloque, actualizado_por INTO v_bloque, v_por;
  PERFORM set_config('prueba.bloque', v_bloque::TEXT, TRUE);
  IF v_por IS DISTINCT FROM current_setting('prueba.dueno')::UUID THEN
    RAISE EXCEPTION 'FALLO 1: actualizado_por should be the owner';
  END IF;
END $$;

-- Nobody can create a site in someone else's name
DO $$
BEGIN
  INSERT INTO web (nombre, plantilla, paleta, id_dueno_fk)
  VALUES ('Ajena', 'vacia',
    '{"fondo":"#ffffff","superficie":"#f5f5f5","texto":"#111111","texto_suave":"#555555","primario":"#000000","sobre_primario":"#ffffff"}',
    current_setting('prueba.otro')::UUID);
  RAISE EXCEPTION 'FALLO 1: a site was created with another owner';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

-- ------------------------------------------------------------
-- 2. A non-member cannot see the site, its blocks or its people
-- ------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.otro@test.local', 'role', 'authenticated')::TEXT, TRUE);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM web WHERE id_web = current_setting('prueba.web')::UUID) THEN
    RAISE EXCEPTION 'FALLO 2: a non-member sees the site';
  END IF;
  IF EXISTS (SELECT 1 FROM web_bloque WHERE id_web_fk = current_setting('prueba.web')::UUID) THEN
    RAISE EXCEPTION 'FALLO 2: a non-member sees the blocks';
  END IF;
  IF rol_en_web(current_setting('prueba.web')::UUID) IS NOT NULL THEN
    RAISE EXCEPTION 'FALLO 2: rol_en_web should be NULL for a non-member';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. Collaborator rules and limits (as the owner)
-- ------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.dueno@test.local', 'role', 'authenticated')::TEXT, TRUE);

-- Two editors are accepted
INSERT INTO web_colaborador (id_web_fk, id_empleado_fk, rol) VALUES
  (current_setting('prueba.web')::UUID, current_setting('prueba.editor1')::UUID, 'editor'),
  (current_setting('prueba.web')::UUID, current_setting('prueba.editor2')::UUID, 'editor');

-- A third editor is rejected (owner + 2)
DO $$
BEGIN
  INSERT INTO web_colaborador (id_web_fk, id_empleado_fk, rol)
  VALUES (current_setting('prueba.web')::UUID, current_setting('prueba.editor3')::UUID, 'editor');
  RAISE EXCEPTION 'FALLO 3: a 3rd editor was accepted';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Ya hay 3 editores contando al dueño' THEN RAISE; END IF;
END $$;

-- Three readers are accepted (6 people with the owner)
INSERT INTO web_colaborador (id_web_fk, id_empleado_fk, rol) VALUES
  (current_setting('prueba.web')::UUID, current_setting('prueba.lector1')::UUID, 'lector'),
  (current_setting('prueba.web')::UUID, current_setting('prueba.lector2')::UUID, 'lector'),
  (current_setting('prueba.web')::UUID, current_setting('prueba.lector3')::UUID, 'lector');

-- A 7th person is rejected
DO $$
BEGIN
  INSERT INTO web_colaborador (id_web_fk, id_empleado_fk, rol)
  VALUES (current_setting('prueba.web')::UUID, current_setting('prueba.editor3')::UUID, 'lector');
  RAISE EXCEPTION 'FALLO 3: a 7th person was accepted';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Máximo 6 personas en una web' THEN RAISE; END IF;
END $$;

-- Turning a reader into a 3rd editor is rejected too
DO $$
BEGIN
  UPDATE web_colaborador SET rol = 'editor'
  WHERE id_web_fk = current_setting('prueba.web')::UUID AND id_empleado_fk = current_setting('prueba.lector1')::UUID;
  RAISE EXCEPTION 'FALLO 3: a reader was turned into a 3rd editor';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Ya hay 3 editores contando al dueño' THEN RAISE; END IF;
END $$;

-- Updating an existing row does not count that row twice
UPDATE web_colaborador SET rol = 'editor'
WHERE id_web_fk = current_setting('prueba.web')::UUID AND id_empleado_fk = current_setting('prueba.editor1')::UUID;

-- Admins, inactive employees and the owner cannot be collaborators
DO $$
BEGIN
  INSERT INTO web_colaborador (id_web_fk, id_empleado_fk, rol)
  VALUES (current_setting('prueba.web')::UUID, current_setting('prueba.admin')::UUID, 'lector');
  RAISE EXCEPTION 'FALLO 3: an admin was added as collaborator';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Los administradores ya pueden ver y editar todas las webs' THEN RAISE; END IF;
END $$;

DO $$
BEGIN
  INSERT INTO web_colaborador (id_web_fk, id_empleado_fk, rol)
  VALUES (current_setting('prueba.web')::UUID, current_setting('prueba.inactivo')::UUID, 'lector');
  RAISE EXCEPTION 'FALLO 3: an inactive employee was added';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Solo se pueden añadir empleados activos' THEN RAISE; END IF;
END $$;

DO $$
BEGIN
  INSERT INTO web_colaborador (id_web_fk, id_empleado_fk, rol)
  VALUES (current_setting('prueba.web')::UUID, current_setting('prueba.dueno')::UUID, 'editor');
  RAISE EXCEPTION 'FALLO 3: the owner was added as collaborator';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'El dueño de la web no puede ser colaborador' THEN RAISE; END IF;
END $$;

-- The owner removes a reader (leaves room for the RLS checks below)
DO $$
DECLARE n INT;
BEGIN
  DELETE FROM web_colaborador
  WHERE id_web_fk = current_setting('prueba.web')::UUID AND id_empleado_fk = current_setting('prueba.lector3')::UUID;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FALLO 3: the owner could not remove a reader'; END IF;
END $$;

-- ------------------------------------------------------------
-- 4. A reader sees everything but changes nothing
-- ------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.lector1@test.local', 'role', 'authenticated')::TEXT, TRUE);

DO $$
DECLARE n INT;
BEGIN
  IF rol_en_web(current_setting('prueba.web')::UUID) IS DISTINCT FROM 'lector' THEN
    RAISE EXCEPTION 'FALLO 4: rol_en_web should be lector';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM web WHERE id_web = current_setting('prueba.web')::UUID) THEN
    RAISE EXCEPTION 'FALLO 4: a reader cannot see the site';
  END IF;
  IF (SELECT COUNT(*) FROM web_colaborador WHERE id_web_fk = current_setting('prueba.web')::UUID) <> 4 THEN
    RAISE EXCEPTION 'FALLO 4: a reader should see the 4 collaborators';
  END IF;

  UPDATE web_bloque SET contenido = '{"titulo":"Lector"}' WHERE id_bloque = current_setting('prueba.bloque')::UUID;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALLO 4: a reader updated a block'; END IF;

  UPDATE web SET nombre = 'Lector' WHERE id_web = current_setting('prueba.web')::UUID;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALLO 4: a reader renamed the site'; END IF;

  DELETE FROM web WHERE id_web = current_setting('prueba.web')::UUID;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALLO 4: a reader deleted the site'; END IF;
END $$;

DO $$
BEGIN
  INSERT INTO web_bloque (id_web_fk, tipo, orden)
  VALUES (current_setting('prueba.web')::UUID, 'texto', 2000);
  RAISE EXCEPTION 'FALLO 4: a reader inserted a block';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

-- ------------------------------------------------------------
-- 5. An editor edits blocks and the site, but not people or the owner
-- ------------------------------------------------------------
RESET ROLE;
-- Pretend the site was last changed long ago, to see the block trigger bump it
ALTER TABLE web DISABLE TRIGGER trigger_tocar_web;
UPDATE web SET actualizada = '2000-01-01' WHERE id_web = current_setting('prueba.web')::UUID;
ALTER TABLE web ENABLE TRIGGER trigger_tocar_web;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.editor1@test.local', 'role', 'authenticated')::TEXT, TRUE);

DO $$
DECLARE n INT;
BEGIN
  UPDATE web_bloque SET contenido = '{"titulo":"Editor"}' WHERE id_bloque = current_setting('prueba.bloque')::UUID;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FALLO 5: an editor could not update a block'; END IF;
  IF (SELECT actualizado_por FROM web_bloque WHERE id_bloque = current_setting('prueba.bloque')::UUID)
     IS DISTINCT FROM current_setting('prueba.editor1')::UUID THEN
    RAISE EXCEPTION 'FALLO 5: actualizado_por should be the editor';
  END IF;
  IF (SELECT actualizada FROM web WHERE id_web = current_setting('prueba.web')::UUID) <= '2000-01-01' THEN
    RAISE EXCEPTION 'FALLO 5: a block change did not bump web.actualizada';
  END IF;

  UPDATE web SET nombre = 'Web renombrada' WHERE id_web = current_setting('prueba.web')::UUID;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FALLO 5: an editor could not rename the site'; END IF;

  DELETE FROM web_colaborador
  WHERE id_web_fk = current_setting('prueba.web')::UUID AND id_empleado_fk = current_setting('prueba.lector1')::UUID;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALLO 5: an editor removed a collaborator'; END IF;

  DELETE FROM web WHERE id_web = current_setting('prueba.web')::UUID;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 0 THEN RAISE EXCEPTION 'FALLO 5: an editor deleted the site'; END IF;
END $$;

-- A block change right after a recent bump leaves web.actualizada alone
RESET ROLE;
ALTER TABLE web DISABLE TRIGGER trigger_tocar_web;
UPDATE web SET actualizada = NOW() - INTERVAL '10 seconds' WHERE id_web = current_setting('prueba.web')::UUID;
ALTER TABLE web ENABLE TRIGGER trigger_tocar_web;
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  UPDATE web_bloque SET contenido = '{"titulo":"Editor otra vez"}' WHERE id_bloque = current_setting('prueba.bloque')::UUID;
  IF (SELECT actualizada FROM web WHERE id_web = current_setting('prueba.web')::UUID)
     IS DISTINCT FROM NOW() - INTERVAL '10 seconds' THEN
    RAISE EXCEPTION 'FALLO 5: web.actualizada was bumped again within a minute';
  END IF;
END $$;

-- An editor cannot take the site (no UPDATE privilege on id_dueno_fk)
DO $$
BEGIN
  UPDATE web SET id_dueno_fk = current_setting('prueba.editor1')::UUID
  WHERE id_web = current_setting('prueba.web')::UUID;
  RAISE EXCEPTION 'FALLO 5: an editor changed the owner';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

-- An editor cannot invite
DO $$
BEGIN
  INSERT INTO web_colaborador (id_web_fk, id_empleado_fk, rol)
  VALUES (current_setting('prueba.web')::UUID, current_setting('prueba.otro')::UUID, 'lector');
  RAISE EXCEPTION 'FALLO 5: an editor added a collaborator';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

-- Neither can a non-member
SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.otro@test.local', 'role', 'authenticated')::TEXT, TRUE);

DO $$
BEGIN
  INSERT INTO web_colaborador (id_web_fk, id_empleado_fk, rol)
  VALUES (current_setting('prueba.web')::UUID, current_setting('prueba.otro')::UUID, 'lector');
  RAISE EXCEPTION 'FALLO 5: a non-member added themselves as collaborator';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END $$;

-- ------------------------------------------------------------
-- 6. An admin who is not invited sees and edits the site
-- ------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.admin@test.local', 'role', 'authenticated')::TEXT, TRUE);

DO $$
DECLARE n INT;
BEGIN
  IF rol_en_web(current_setting('prueba.web')::UUID) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'FALLO 6: rol_en_web should be admin';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM web WHERE id_web = current_setting('prueba.web')::UUID) THEN
    RAISE EXCEPTION 'FALLO 6: an admin cannot see the site';
  END IF;

  UPDATE web_bloque SET contenido = '{"titulo":"Admin"}' WHERE id_bloque = current_setting('prueba.bloque')::UUID;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FALLO 6: an admin could not update a block'; END IF;

  UPDATE web SET nombre = 'Web del admin' WHERE id_web = current_setting('prueba.web')::UUID;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FALLO 6: an admin could not rename the site'; END IF;

  -- Admins manage people too (the site has 4 rows, so one more fits)
  INSERT INTO web_colaborador (id_web_fk, id_empleado_fk, rol)
  VALUES (current_setting('prueba.web')::UUID, current_setting('prueba.otro')::UUID, 'lector');
END $$;

-- ------------------------------------------------------------
-- 7. cambiar_dueno: refused to a non-admin owner, done by an admin
-- ------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.dueno@test.local', 'role', 'authenticated')::TEXT, TRUE);

DO $$
BEGIN
  PERFORM cambiar_dueno(current_setting('prueba.web')::UUID, current_setting('prueba.editor2')::UUID);
  RAISE EXCEPTION 'FALLO 7: a non-admin owner changed the owner';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Solo un administrador puede cambiar el dueño de una web' THEN RAISE; END IF;
END $$;

SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.admin@test.local', 'role', 'authenticated')::TEXT, TRUE);

DO $$
BEGIN
  PERFORM cambiar_dueno(current_setting('prueba.web')::UUID, current_setting('prueba.inactivo')::UUID);
  RAISE EXCEPTION 'FALLO 7: an inactive employee became owner';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'El nuevo dueño tiene que ser un empleado activo' THEN RAISE; END IF;
END $$;

SELECT cambiar_dueno(current_setting('prueba.web')::UUID, current_setting('prueba.editor2')::UUID);

DO $$
BEGIN
  IF (SELECT id_dueno_fk FROM web WHERE id_web = current_setting('prueba.web')::UUID)
     IS DISTINCT FROM current_setting('prueba.editor2')::UUID THEN
    RAISE EXCEPTION 'FALLO 7: cambiar_dueno did not set the new owner';
  END IF;
  IF EXISTS (SELECT 1 FROM web_colaborador
             WHERE id_web_fk = current_setting('prueba.web')::UUID
               AND id_empleado_fk = current_setting('prueba.editor2')::UUID) THEN
    RAISE EXCEPTION 'FALLO 7: the new owner is still a collaborator row';
  END IF;
END $$;

-- The previous owner no longer sees the site; the new one is dueno
SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.dueno@test.local', 'role', 'authenticated')::TEXT, TRUE);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM web WHERE id_web = current_setting('prueba.web')::UUID) THEN
    RAISE EXCEPTION 'FALLO 7: the previous owner still sees the site';
  END IF;
END $$;

SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.editor2@test.local', 'role', 'authenticated')::TEXT, TRUE);

DO $$
BEGIN
  IF rol_en_web(current_setting('prueba.web')::UUID) IS DISTINCT FROM 'dueno' THEN
    RAISE EXCEPTION 'FALLO 7: the new owner should be dueno';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 8. An admin who creates a site is its owner and counts towards the limits
-- ------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.admin@test.local', 'role', 'authenticated')::TEXT, TRUE);

DO $$
DECLARE v_web UUID;
BEGIN
  INSERT INTO web (nombre, plantilla, paleta)
  VALUES ('Web del admin', 'portfolio',
    '{"fondo":"#ffffff","superficie":"#f5f5f5","texto":"#111111","texto_suave":"#555555","primario":"#000000","sobre_primario":"#ffffff"}')
  RETURNING id_web INTO v_web;
  PERFORM set_config('prueba.web2', v_web::TEXT, TRUE);
  IF rol_en_web(v_web) IS DISTINCT FROM 'dueno' THEN
    RAISE EXCEPTION 'FALLO 8: an admin who creates a site should be dueno';
  END IF;

  INSERT INTO web_colaborador (id_web_fk, id_empleado_fk, rol) VALUES
    (v_web, current_setting('prueba.editor1')::UUID, 'editor'),
    (v_web, current_setting('prueba.editor2')::UUID, 'editor');
END $$;

DO $$
BEGIN
  INSERT INTO web_colaborador (id_web_fk, id_empleado_fk, rol)
  VALUES (current_setting('prueba.web2')::UUID, current_setting('prueba.editor3')::UUID, 'editor');
  RAISE EXCEPTION 'FALLO 8: a 3rd editor was accepted on a site owned by an admin';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM <> 'Ya hay 3 editores contando al dueño' THEN RAISE; END IF;
END $$;

-- ------------------------------------------------------------
-- 9. Another admin sees that site as admin and can delete it
-- ------------------------------------------------------------
SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.admin2@test.local', 'role', 'authenticated')::TEXT, TRUE);

DO $$
DECLARE n INT;
BEGIN
  IF rol_en_web(current_setting('prueba.web2')::UUID) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'FALLO 9: rol_en_web should be admin for another admin';
  END IF;
  DELETE FROM web WHERE id_web = current_setting('prueba.web2')::UUID;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'FALLO 9: an admin could not delete a site'; END IF;
END $$;

RESET ROLE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM web_colaborador WHERE id_web_fk = current_setting('prueba.web2')::UUID) THEN
    RAISE EXCEPTION 'FALLO 9: deleting a site did not remove its collaborators';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 10. Realtime channel: topic parsing, policies, and the role behind a topic
-- ------------------------------------------------------------
DO $$
BEGIN
  IF web_de_topic('web:' || current_setting('prueba.web')) IS DISTINCT FROM current_setting('prueba.web')::UUID THEN
    RAISE EXCEPTION 'FALLO 10: web_de_topic did not parse a site topic';
  END IF;
  IF web_de_topic('web:no-es-un-uuid') IS NOT NULL OR web_de_topic('otro:' || current_setting('prueba.web')) IS NOT NULL
     OR web_de_topic(NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'FALLO 10: web_de_topic accepted a topic that is not a site';
  END IF;
  IF (SELECT COUNT(*) FROM pg_policies
      WHERE schemaname = 'realtime' AND tablename = 'messages'
        AND policyname IN ('webs_canal_leer', 'webs_canal_enviar')) <> 2 THEN
    RAISE EXCEPTION 'FALLO 10: the realtime.messages policies are missing';
  END IF;
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('realtime.topic', 'web:' || current_setting('prueba.web'), TRUE);
SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.lector1@test.local', 'role', 'authenticated')::TEXT, TRUE);

DO $$
BEGIN
  IF rol_en_web(web_de_topic(realtime.topic())) IS DISTINCT FROM 'lector' THEN
    RAISE EXCEPTION 'FALLO 10: a reader should join the channel (presence) but not broadcast';
  END IF;
END $$;

SELECT set_config('request.jwt.claims', json_build_object('email', 'prueba.otro@test.local', 'role', 'authenticated')::TEXT, TRUE);

DO $$
BEGIN
  IF rol_en_web(web_de_topic(realtime.topic())) IS NOT NULL THEN
    RAISE EXCEPTION 'FALLO 10: a non-member would join the channel';
  END IF;
END $$;

RESET ROLE;

SELECT 'webs_prueba: OK' AS resultado;
