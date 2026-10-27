-- ============================================================
-- CRM MI MASCOTA - Datos de ejemplo del módulo Ventas
-- Ejecutar en Supabase SQL Editor DESPUÉS de datos_ejemplo.sql y ventas.sql
-- Las fechas son relativas al día en que se ejecuta: hay pedidos de este
-- mes y del mes pasado para que el Inicio pueda compararlos.
-- Si ya hay ventas no crea más (solo añade al catálogo lo que falte).
-- ============================================================

BEGIN;

-- ============================================================
-- CATÁLOGO: más productos y servicios (precios sin IVA)
-- ============================================================

INSERT INTO servicio (nombre, precio_base, tipo, categoria, iva, descripcion) VALUES
  ('Vacuna antirrábica', 30, 'servicio', 'Vacunas', 21, 'Vacuna de la rabia, obligatoria en perros. Incluye anotación en la cartilla.'),
  ('Vacuna polivalente canina', 42, 'servicio', 'Vacunas', 21, 'Moquillo, parvovirus, hepatitis y leptospirosis.'),
  ('Vacuna trivalente felina', 38, 'servicio', 'Vacunas', 21, 'Panleucopenia, rinotraqueítis y calicivirus.'),
  ('Pipeta antiparasitaria perro', 14.50, 'producto', 'Medicamentos', 10, 'Protección contra pulgas y garrapatas durante un mes.'),
  ('Comprimido antiparasitario interno', 6.80, 'producto', 'Medicamentos', 10, 'Un comprimido contra gusanos intestinales.'),
  ('Champú dermatológico', 12.40, 'producto', 'Medicamentos', 10, 'Champú para pieles sensibles o con dermatitis. 200 ml.'),
  ('Pienso cachorro 3 kg', 24.90, 'producto', 'Alimentación', 21, 'Pienso completo para cachorros de raza mediana.'),
  ('Pienso gato adulto 2 kg', 18.50, 'producto', 'Alimentación', 21, 'Pienso completo para gatos adultos esterilizados.'),
  ('Pienso renal 2 kg', 27.90, 'producto', 'Alimentación', 21, 'Dieta veterinaria para problemas de riñón.'),
  ('Collar isabelino', 9.90, 'producto', 'Accesorios', 21, 'Collar protector para después de una cirugía.'),
  ('Análisis prequirúrgico', 55, 'servicio', 'Pruebas', 21, 'Análisis de sangre antes de la anestesia.'),
  ('Radiografía', 45, 'servicio', 'Pruebas', 21, 'Una proyección radiográfica con informe.'),
  ('Limpieza dental', 120, 'servicio', 'Cirugía', 21, 'Limpieza de sarro con ultrasonidos y anestesia.')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- VENTAS
-- ============================================================
-- Cada venta se crea como presupuesto, se le añaden las líneas y después
-- pasa por los estados permitidos con las fechas de envío y confirmación
-- puestas a mano (en el pasado). Si algún cliente no existe, se salta.

DO $$
DECLARE
  -- Fechas de referencia
  d_hoy DATE := CURRENT_DATE;
  d_mes DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;                 -- día 1 de este mes
  d_ant DATE := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;  -- día 1 del mes pasado
  d DATE;
  -- Empleados
  e_javier UUID; e_marta UUID; e_sergio UUID; e_elena UUID;
  -- Empresas
  em_soto UUID; em_almendros UUID; em_huellas UUID; em_animalia UUID; em_bosque UUID;
  -- Particulares
  p_lucia UUID; p_carlos UUID; p_diego UUID; p_irene UUID; p_miguel UUID; p_andres UUID;
  -- Animales
  a_kiko UUID; a_rocky UUID; a_bimba UUID; a_nala UUID; a_lola UUID; a_blanquita UUID;
  a_estrella UUID; a_maya UUID; a_duna UUID;
  -- Oportunidades
  o_nala UUID; o_rocky UUID; o_kiko UUID; o_animalia UUID; o_camada UUID; o_ganado UUID;
  o_adopciones UUID; o_huespedes UUID; o_duna UUID;
  -- Venta que se está creando
  v UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM venta) THEN
    RAISE NOTICE 'Ya hay ventas: no se cargan las de ejemplo';
    RETURN;
  END IF;

  -- ------------------------------------------------------------
  -- BUSCAR LO QUE CREA datos_ejemplo.sql
  -- ------------------------------------------------------------
  SELECT id_empleado INTO e_javier FROM empleado WHERE correo = 'javier.ruiz@mimascota.es';
  SELECT id_empleado INTO e_marta FROM empleado WHERE correo = 'marta.sanchez@mimascota.es';
  SELECT id_empleado INTO e_sergio FROM empleado WHERE correo = 'sergio.navarro@mimascota.es';
  SELECT id_empleado INTO e_elena FROM empleado WHERE correo = 'recepcion@mimascota.es';

  SELECT id_empresa INTO em_soto FROM empresa WHERE nombre = 'Granja El Soto' LIMIT 1;
  SELECT id_empresa INTO em_almendros FROM empresa WHERE nombre = 'Criadero Los Almendros' LIMIT 1;
  SELECT id_empresa INTO em_huellas FROM empresa WHERE nombre = 'Protectora Huellas' LIMIT 1;
  SELECT id_empresa INTO em_animalia FROM empresa WHERE nombre = 'Tienda Animalia' LIMIT 1;
  SELECT id_empresa INTO em_bosque FROM empresa WHERE nombre = 'Residencia Canina El Bosque' LIMIT 1;

  SELECT id_particular INTO p_lucia FROM particular WHERE correo = 'lucia.fernandez@gmail.com' LIMIT 1;
  SELECT id_particular INTO p_carlos FROM particular WHERE correo = 'carlos.gomez@gmail.com' LIMIT 1;
  SELECT id_particular INTO p_diego FROM particular WHERE correo = 'diego.lopez@gmail.com' LIMIT 1;
  SELECT id_particular INTO p_irene FROM particular WHERE correo = 'irene.vazquez@gmail.com' LIMIT 1;
  SELECT id_particular INTO p_miguel FROM particular WHERE correo = 'miguel.herrero@gmail.com' LIMIT 1;
  SELECT id_particular INTO p_andres FROM particular WHERE correo = 'andres.romero@gmail.com' LIMIT 1;

  -- Animales buscados junto a su dueño (así siempre son del cliente de la venta)
  SELECT a.id_animal INTO a_kiko FROM animal a JOIN animal_particular ap ON ap.id_animal_fk = a.id_animal
  WHERE ap.id_particular_fk = p_lucia AND a.nombre = 'Kiko' LIMIT 1;
  SELECT a.id_animal INTO a_rocky FROM animal a JOIN animal_particular ap ON ap.id_animal_fk = a.id_animal
  WHERE ap.id_particular_fk = p_carlos AND a.nombre = 'Rocky' LIMIT 1;
  SELECT a.id_animal INTO a_bimba FROM animal a JOIN animal_particular ap ON ap.id_animal_fk = a.id_animal
  WHERE ap.id_particular_fk = p_diego AND a.nombre = 'Bimba' LIMIT 1;
  SELECT a.id_animal INTO a_nala FROM animal a JOIN animal_particular ap ON ap.id_animal_fk = a.id_animal
  WHERE ap.id_particular_fk = p_irene AND a.nombre = 'Nala' LIMIT 1;
  SELECT a.id_animal INTO a_lola FROM animal a JOIN animal_particular ap ON ap.id_animal_fk = a.id_animal
  WHERE ap.id_particular_fk = p_miguel AND a.nombre = 'Lola' LIMIT 1;
  SELECT a.id_animal INTO a_blanquita FROM animal a JOIN animal_particular ap ON ap.id_animal_fk = a.id_animal
  WHERE ap.id_particular_fk = p_andres AND a.nombre = 'Blanquita' LIMIT 1;
  SELECT id_animal INTO a_estrella FROM animal WHERE id_empresa_fk = em_soto AND nombre = 'Estrella' LIMIT 1;
  SELECT id_animal INTO a_maya FROM animal WHERE id_empresa_fk = em_almendros AND nombre = 'Maya' LIMIT 1;
  SELECT id_animal INTO a_duna FROM animal WHERE id_empresa_fk = em_almendros AND nombre = 'Duna' LIMIT 1;

  SELECT id_oportunidad INTO o_nala FROM oportunidad WHERE titulo = 'Esterilización · Nala' ORDER BY fecha_creacion LIMIT 1;
  SELECT id_oportunidad INTO o_rocky FROM oportunidad WHERE titulo = 'Cirugía dental · Rocky' ORDER BY fecha_creacion LIMIT 1;
  SELECT id_oportunidad INTO o_kiko FROM oportunidad WHERE titulo = 'Vacunas anuales · Kiko' ORDER BY fecha_creacion LIMIT 1;
  SELECT id_oportunidad INTO o_animalia FROM oportunidad WHERE titulo = 'Convenio de venta de pienso' ORDER BY fecha_creacion LIMIT 1;
  SELECT id_oportunidad INTO o_camada FROM oportunidad WHERE titulo = 'Vacunación de la camada' ORDER BY fecha_creacion LIMIT 1;
  SELECT id_oportunidad INTO o_ganado FROM oportunidad WHERE titulo = 'Revisión mensual del ganado' ORDER BY fecha_creacion LIMIT 1;
  SELECT id_oportunidad INTO o_adopciones FROM oportunidad WHERE titulo = 'Vacunas de nuevas adopciones' ORDER BY fecha_creacion LIMIT 1;
  SELECT id_oportunidad INTO o_huespedes FROM oportunidad WHERE titulo = 'Revisión de huéspedes' ORDER BY fecha_creacion LIMIT 1;
  SELECT id_oportunidad INTO o_duna FROM oportunidad WHERE titulo = 'Cirugía de Duna' ORDER BY fecha_creacion LIMIT 1;

  -- ------------------------------------------------------------
  -- CANCELADO desde enviado: cirugía de Duna (el cliente la descartó)
  -- ------------------------------------------------------------
  IF em_almendros IS NOT NULL THEN
    d := d_hoy - 49;
    INSERT INTO venta (id_empresa_fk, id_animal_fk, id_oportunidad_fk, id_responsable_fk, fecha, fecha_validez,
                       condiciones_pago, notas, fecha_creacion)
    VALUES (em_almendros, a_duna, o_duna, e_javier, d, d + 30, '30_dias',
            'Operación de ligamento cruzado. El cliente lo considera demasiado caro.', d + TIME '10:00')
    RETURNING id_venta INTO v;
    INSERT INTO linea_venta (id_venta_fk, id_servicio_fk, descripcion, cantidad, precio_unitario, descuento, iva, orden)
    SELECT v, s.id_servicio, s.nombre, l.cantidad, s.precio_base, l.descuento, s.iva, l.orden
    FROM (VALUES ('Análisis prequirúrgico', 1, 0, 1), ('Radiografía', 2, 0, 2), ('Cirugía', 1, 0, 3))
      AS l(nombre, cantidad, descuento, orden)
    JOIN servicio s ON s.nombre = l.nombre;
    -- Línea de texto libre (sin servicio del catálogo)
    INSERT INTO linea_venta (id_venta_fk, descripcion, cantidad, precio_unitario, iva, orden)
    VALUES (v, 'Hospitalización postoperatoria (por noche)', 2, 40, 21, 4);
    UPDATE venta SET estado = 'enviado', fecha_envio = d + TIME '12:30' WHERE id_venta = v;
    UPDATE venta SET estado = 'cancelado' WHERE id_venta = v;
  END IF;

  -- ------------------------------------------------------------
  -- PRESUPUESTO caducado: peluquería de Bimba (nunca se envió)
  -- ------------------------------------------------------------
  IF p_diego IS NOT NULL THEN
    d := d_hoy - 45;
    INSERT INTO venta (id_particular_fk, id_animal_fk, id_responsable_fk, fecha, fecha_validez, notas, fecha_creacion)
    VALUES (p_diego, a_bimba, e_sergio, d, d + 30, 'Baño con champú para la dermatitis.', d + TIME '11:15')
    RETURNING id_venta INTO v;
    INSERT INTO linea_venta (id_venta_fk, id_servicio_fk, descripcion, cantidad, precio_unitario, descuento, iva, orden)
    SELECT v, s.id_servicio, s.nombre, l.cantidad, s.precio_base, l.descuento, s.iva, l.orden
    FROM (VALUES ('Peluquería', 1, 0, 1), ('Champú dermatológico', 1, 10, 2))
      AS l(nombre, cantidad, descuento, orden)
    JOIN servicio s ON s.nombre = l.nombre;
  END IF;

  -- ------------------------------------------------------------
  -- ENVIADO caducado: radiografía de Lola (el cliente no ha contestado)
  -- ------------------------------------------------------------
  IF p_miguel IS NOT NULL THEN
    d := d_hoy - 40;
    INSERT INTO venta (id_particular_fk, id_animal_fk, id_responsable_fk, fecha, fecha_validez, notas, fecha_creacion)
    VALUES (p_miguel, a_lola, e_javier, d, d + 30, 'Revisión tras la urgencia.', d + TIME '16:40')
    RETURNING id_venta INTO v;
    INSERT INTO linea_venta (id_venta_fk, id_servicio_fk, descripcion, cantidad, precio_unitario, descuento, iva, orden)
    SELECT v, s.id_servicio, s.nombre, l.cantidad, s.precio_base, l.descuento, s.iva, l.orden
    FROM (VALUES ('Consulta general', 1, 0, 1), ('Radiografía', 2, 0, 2))
      AS l(nombre, cantidad, descuento, orden)
    JOIN servicio s ON s.nombre = l.nombre;
    UPDATE venta SET estado = 'enviado', fecha_envio = (d + 1) + TIME '09:20' WHERE id_venta = v;
  END IF;

  -- ------------------------------------------------------------
  -- CANCELADO desde presupuesto: Blanquita (se fue a otra clínica)
  -- ------------------------------------------------------------
  IF p_andres IS NOT NULL THEN
    d := d_hoy - 34;
    INSERT INTO venta (id_particular_fk, id_animal_fk, id_responsable_fk, fecha, fecha_validez, notas, fecha_creacion)
    VALUES (p_andres, a_blanquita, e_marta, d, d + 30, 'El cliente se lo lleva a otra clínica.', d + TIME '10:05')
    RETURNING id_venta INTO v;
    INSERT INTO linea_venta (id_venta_fk, id_servicio_fk, descripcion, cantidad, precio_unitario, descuento, iva, orden)
    SELECT v, s.id_servicio, s.nombre, l.cantidad, s.precio_base, l.descuento, s.iva, l.orden
    FROM (VALUES ('Consulta general', 1, 0, 1), ('Análisis y pruebas', 1, 0, 2))
      AS l(nombre, cantidad, descuento, orden)
    JOIN servicio s ON s.nombre = l.nombre;
    UPDATE venta SET estado = 'cancelado' WHERE id_venta = v;
  END IF;

  -- ------------------------------------------------------------
  -- PEDIDO del mes pasado: vacunas de las adopciones (precio de convenio)
  -- ------------------------------------------------------------
  IF em_huellas IS NOT NULL THEN
    d := d_ant + 3;
    INSERT INTO venta (id_empresa_fk, id_oportunidad_fk, id_responsable_fk, fecha, fecha_validez,
                       condiciones_pago, notas, fecha_creacion)
    VALUES (em_huellas, o_adopciones, e_sergio, d, d + 30, '30_dias', 'Descuento del 20 % por convenio.', d + TIME '09:30')
    RETURNING id_venta INTO v;
    INSERT INTO linea_venta (id_venta_fk, id_servicio_fk, descripcion, cantidad, precio_unitario, descuento, iva, orden)
    SELECT v, s.id_servicio, s.nombre, l.cantidad, s.precio_base, l.descuento, s.iva, l.orden
    FROM (VALUES ('Vacuna polivalente canina', 3, 20, 1), ('Chip e identificación', 3, 20, 2),
                 ('Comprimido antiparasitario interno', 3, 0, 3))
      AS l(nombre, cantidad, descuento, orden)
    JOIN servicio s ON s.nombre = l.nombre;
    UPDATE venta SET estado = 'enviado', fecha_envio = (d + 1) + TIME '10:00' WHERE id_venta = v;
    UPDATE venta SET estado = 'pedido', fecha_confirmacion = (d + 5) + TIME '11:30' WHERE id_venta = v;
  END IF;

  -- ------------------------------------------------------------
  -- PEDIDO del mes pasado: revisión de los perros de la residencia
  -- ------------------------------------------------------------
  IF em_bosque IS NOT NULL THEN
    d := d_ant + 12;
    INSERT INTO venta (id_empresa_fk, id_oportunidad_fk, id_responsable_fk, fecha, fecha_validez,
                       condiciones_pago, notas, fecha_creacion)
    VALUES (em_bosque, o_huespedes, e_marta, d, d + 30, '15_dias', 'Revisión de temporada alta: 12 perros.', d + TIME '12:00')
    RETURNING id_venta INTO v;
    INSERT INTO linea_venta (id_venta_fk, id_servicio_fk, descripcion, cantidad, precio_unitario, descuento, iva, orden)
    SELECT v, s.id_servicio, s.nombre, l.cantidad, s.precio_base, l.descuento, s.iva, l.orden
    FROM (VALUES ('Consulta general', 12, 15, 1), ('Pipeta antiparasitaria perro', 12, 10, 2))
      AS l(nombre, cantidad, descuento, orden)
    JOIN servicio s ON s.nombre = l.nombre;
    UPDATE venta SET estado = 'pedido', fecha_confirmacion = (d + 6) + TIME '16:00' WHERE id_venta = v;
  END IF;

  -- ------------------------------------------------------------
  -- ENVIADO: vacunas de la camada de Maya
  -- ------------------------------------------------------------
  IF em_almendros IS NOT NULL THEN
    d := d_hoy - 10;
    INSERT INTO venta (id_empresa_fk, id_animal_fk, id_oportunidad_fk, id_responsable_fk, fecha, fecha_validez,
                       condiciones_pago, notas, fecha_creacion)
    VALUES (em_almendros, a_maya, o_camada, e_javier, d, d + 30, '30_dias', 'Camada de 6 cachorros de pastor alemán.', d + TIME '09:45')
    RETURNING id_venta INTO v;
    INSERT INTO linea_venta (id_venta_fk, id_servicio_fk, descripcion, cantidad, precio_unitario, descuento, iva, orden)
    SELECT v, s.id_servicio, s.nombre, l.cantidad, s.precio_base, l.descuento, s.iva, l.orden
    FROM (VALUES ('Vacuna polivalente canina', 6, 10, 1), ('Chip e identificación', 6, 10, 2),
                 ('Pipeta antiparasitaria perro', 6, 0, 3))
      AS l(nombre, cantidad, descuento, orden)
    JOIN servicio s ON s.nombre = l.nombre;
    UPDATE venta SET estado = 'enviado', fecha_envio = d + TIME '13:10' WHERE id_venta = v;
  END IF;

  -- ------------------------------------------------------------
  -- PRESUPUESTO: limpieza dental de Rocky (pendiente de enviar)
  -- ------------------------------------------------------------
  IF p_carlos IS NOT NULL THEN
    d := d_hoy - 9;
    INSERT INTO venta (id_particular_fk, id_animal_fk, id_oportunidad_fk, id_responsable_fk, fecha, fecha_validez,
                       notas, fecha_creacion)
    VALUES (p_carlos, a_rocky, o_rocky, e_javier, d, d + 30, 'Limpieza de boca con anestesia.', d + TIME '17:20')
    RETURNING id_venta INTO v;
    INSERT INTO linea_venta (id_venta_fk, id_servicio_fk, descripcion, cantidad, precio_unitario, descuento, iva, orden)
    SELECT v, s.id_servicio, s.nombre, l.cantidad, s.precio_base, l.descuento, s.iva, l.orden
    FROM (VALUES ('Análisis prequirúrgico', 1, 0, 1), ('Limpieza dental', 1, 10, 2), ('Collar isabelino', 1, 0, 3))
      AS l(nombre, cantidad, descuento, orden)
    JOIN servicio s ON s.nombre = l.nombre;
  END IF;

  -- ------------------------------------------------------------
  -- PEDIDO de este mes: revisión del ganado de la granja
  -- ------------------------------------------------------------
  IF em_soto IS NOT NULL THEN
    d := GREATEST(d_mes, d_hoy - 8);
    INSERT INTO venta (id_empresa_fk, id_animal_fk, id_oportunidad_fk, id_responsable_fk, fecha, fecha_validez,
                       condiciones_pago, notas, fecha_creacion)
    VALUES (em_soto, a_estrella, o_ganado, e_marta, d, d + 30, '30_dias', 'Revisión mensual. Precio de convenio.',
            LEAST(d + TIME '09:00', NOW()))
    RETURNING id_venta INTO v;
    INSERT INTO linea_venta (id_venta_fk, id_servicio_fk, descripcion, cantidad, precio_unitario, descuento, iva, orden)
    SELECT v, s.id_servicio, s.nombre, l.cantidad, s.precio_base, l.descuento, s.iva, l.orden
    FROM (VALUES ('Revisión de granja', 1, 0, 1), ('Desparasitación', 12, 20, 2))
      AS l(nombre, cantidad, descuento, orden)
    JOIN servicio s ON s.nombre = l.nombre;
    UPDATE venta SET estado = 'enviado', fecha_envio = LEAST(d + TIME '10:00', NOW()) WHERE id_venta = v;
    UPDATE venta SET estado = 'pedido', fecha_confirmacion = LEAST(GREATEST(d_mes, d_hoy - 6) + TIME '12:00', NOW())
    WHERE id_venta = v;
  END IF;

  -- ------------------------------------------------------------
  -- PEDIDO de este mes: vacunas anuales de Kiko (confirmado en el mostrador)
  -- ------------------------------------------------------------
  IF p_lucia IS NOT NULL THEN
    d := GREATEST(d_mes, d_hoy - 3);
    INSERT INTO venta (id_particular_fk, id_animal_fk, id_oportunidad_fk, id_responsable_fk, fecha, fecha_validez,
                       notas, fecha_creacion)
    VALUES (p_lucia, a_kiko, o_kiko, e_javier, d, d + 30, 'Vacuna anual y de la rabia.', LEAST(d + TIME '10:30', NOW()))
    RETURNING id_venta INTO v;
    INSERT INTO linea_venta (id_venta_fk, id_servicio_fk, descripcion, cantidad, precio_unitario, descuento, iva, orden)
    SELECT v, s.id_servicio, s.nombre, l.cantidad, s.precio_base, l.descuento, s.iva, l.orden
    FROM (VALUES ('Consulta general', 1, 0, 1), ('Vacuna antirrábica', 1, 0, 2), ('Vacuna polivalente canina', 1, 10, 3))
      AS l(nombre, cantidad, descuento, orden)
    JOIN servicio s ON s.nombre = l.nombre;
    UPDATE venta SET estado = 'pedido', fecha_confirmacion = LEAST(GREATEST(d_mes, d_hoy - 1) + TIME '17:00', NOW())
    WHERE id_venta = v;
  END IF;

  -- ------------------------------------------------------------
  -- ENVIADO: esterilización de Nala (al enviarlo, la oportunidad pasa a Presupuesto)
  -- ------------------------------------------------------------
  IF p_irene IS NOT NULL THEN
    d := d_hoy - 3;
    INSERT INTO venta (id_particular_fk, id_animal_fk, id_oportunidad_fk, id_responsable_fk, fecha, fecha_validez,
                       notas, fecha_creacion)
    VALUES (p_irene, a_nala, o_nala, e_marta, d, d + 30, 'Para cuando Nala cumpla los seis meses.', d + TIME '11:00')
    RETURNING id_venta INTO v;
    INSERT INTO linea_venta (id_venta_fk, id_servicio_fk, descripcion, cantidad, precio_unitario, descuento, iva, orden)
    SELECT v, s.id_servicio, s.nombre, l.cantidad, s.precio_base, l.descuento, s.iva, l.orden
    FROM (VALUES ('Análisis prequirúrgico', 1, 0, 1), ('Esterilización', 1, 5, 2), ('Collar isabelino', 1, 0, 3))
      AS l(nombre, cantidad, descuento, orden)
    JOIN servicio s ON s.nombre = l.nombre;
    UPDATE venta SET estado = 'enviado', fecha_envio = (d + 1) + TIME '09:15' WHERE id_venta = v;
  END IF;

  -- ------------------------------------------------------------
  -- PRESUPUESTO: pienso para la tienda (pedido de prueba con descuento)
  -- ------------------------------------------------------------
  IF em_animalia IS NOT NULL THEN
    d := d_hoy - 1;
    INSERT INTO venta (id_empresa_fk, id_oportunidad_fk, id_responsable_fk, fecha, fecha_validez,
                       condiciones_pago, notas, fecha_creacion)
    VALUES (em_animalia, o_animalia, e_elena, d, d + 15, '30_dias', 'Primer pedido de prueba del convenio.', d + TIME '13:45')
    RETURNING id_venta INTO v;
    INSERT INTO linea_venta (id_venta_fk, id_servicio_fk, descripcion, cantidad, precio_unitario, descuento, iva, orden)
    SELECT v, s.id_servicio, s.nombre, l.cantidad, s.precio_base, l.descuento, s.iva, l.orden
    FROM (VALUES ('Pienso cachorro 3 kg', 10, 15, 1), ('Pienso gato adulto 2 kg', 10, 15, 2), ('Pienso renal 2 kg', 4, 10, 3))
      AS l(nombre, cantidad, descuento, orden)
    JOIN servicio s ON s.nombre = l.nombre;
  END IF;

  -- ------------------------------------------------------------
  -- Historial de las oportunidades con la fecha real de cada paso
  -- (los triggers lo apuntan con la fecha de hoy)
  -- ------------------------------------------------------------
  UPDATE actividad a SET fecha = v2.fecha_creacion
  FROM venta v2
  WHERE a.id_oportunidad_fk = v2.id_oportunidad_fk AND a.descripcion = 'Presupuesto ' || codigo_venta(v2.numero) || ' creado';
  UPDATE actividad a SET fecha = v2.fecha_envio
  FROM venta v2
  WHERE a.id_oportunidad_fk = v2.id_oportunidad_fk AND a.descripcion = 'Presupuesto ' || codigo_venta(v2.numero) || ' enviado';
  UPDATE actividad a SET fecha = v2.fecha_confirmacion
  FROM venta v2
  WHERE a.id_oportunidad_fk = v2.id_oportunidad_fk AND a.descripcion LIKE 'Pedido ' || codigo_venta(v2.numero) || ' confirmado%';
END $$;

COMMIT;
