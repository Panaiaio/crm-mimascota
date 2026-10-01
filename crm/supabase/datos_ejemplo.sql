-- ============================================================
-- CRM MI MASCOTA - Datos de ejemplo
-- Ejecutar en Supabase SQL Editor DESPUÉS de schema.sql
-- Las fechas son relativas al día en que se ejecuta.
--
-- Usuarios para entrar (créalos en Authentication → Users → Add user,
-- con "Auto Confirm User" marcado):
--   prueba@gmail.com        → Laura Gómez, administradora
--   recepcion@mimascota.es  → Elena Torres, empleada (sin permisos de admin)
-- ============================================================

DO $$
DECLARE
  -- Empleados
  e_laura UUID; e_javier UUID; e_marta UUID; e_sergio UUID; e_elena UUID; e_pablo UUID;
  -- Empresas
  em_soto UUID; em_almendros UUID; em_huellas UUID; em_dehesa UUID;
  em_animalia UUID; em_bosque UUID; em_montes UUID; em_norte UUID;
  -- Particulares
  p_lucia UUID; p_carlos UUID; p_ana UUID; p_diego UUID; p_raquel UUID; p_hugo UUID; p_nuria UUID;
  p_andres UUID; p_sofia UUID; p_miguel UUID; p_irene UUID; p_tomas UUID; p_carmen UUID; p_alberto UUID;
  -- Animales
  a_kiko UUID; a_luna UUID; a_rocky UUID; a_bimba UUID; a_garfield UUID; a_nala UUID; a_coco UUID;
  a_tambor UUID; a_blanquita UUID; a_simba UUID; a_toby UUID; a_mia UUID; a_lola UUID; a_rufo UUID;
  a_pipo UUID; a_canela UUID; a_thor UUID; a_maya UUID; a_estrella UUID; a_trueno UUID; a_duna UUID;
  -- Selección
  pr_aux UUID; pr_pelu UUID; c_pablo UUID;
  -- Oportunidades
  o UUID;
  d DATE;
  i INT;
BEGIN
  -- ------------------------------------------------------------
  -- EMPLEADOS
  -- ------------------------------------------------------------
  INSERT INTO empleado (nombre, apellidos, correo, telefono, puesto, departamento, rol, fecha_alta)
  VALUES ('Laura', 'Gómez Pérez', 'prueba@gmail.com', '600 111 222', 'Directora de la clínica', 'Dirección', 'admin', CURRENT_DATE - 1460)
  RETURNING id_empleado INTO e_laura;
  INSERT INTO empleado (nombre, apellidos, correo, telefono, puesto, departamento, fecha_alta)
  VALUES ('Javier', 'Ruiz Martín', 'javier.ruiz@mimascota.es', '600 222 333', 'Veterinario', 'Clínica', CURRENT_DATE - 1100)
  RETURNING id_empleado INTO e_javier;
  INSERT INTO empleado (nombre, apellidos, correo, telefono, puesto, departamento, fecha_alta)
  VALUES ('Marta', 'Sánchez López', 'marta.sanchez@mimascota.es', '600 333 444', 'Veterinaria', 'Clínica', CURRENT_DATE - 700)
  RETURNING id_empleado INTO e_marta;
  INSERT INTO empleado (nombre, apellidos, correo, telefono, puesto, departamento, fecha_alta)
  VALUES ('Sergio', 'Navarro Gil', 'sergio.navarro@mimascota.es', '600 444 555', 'Auxiliar veterinario', 'Clínica', CURRENT_DATE - 420)
  RETURNING id_empleado INTO e_sergio;
  INSERT INTO empleado (nombre, apellidos, correo, telefono, puesto, departamento, fecha_alta)
  VALUES ('Elena', 'Torres Vidal', 'recepcion@mimascota.es', '600 555 666', 'Recepcionista', 'Atención al cliente', CURRENT_DATE - 300)
  RETURNING id_empleado INTO e_elena;

  -- Los veteranos ya terminaron su check de inicio
  UPDATE tarea_inicio SET completada = TRUE, fecha_completada = NOW() - INTERVAL '200 days', id_completada_por_fk = e_laura;

  -- ------------------------------------------------------------
  -- SELECCIÓN: un proceso abierto y otro cerrado con una contratación
  -- ------------------------------------------------------------
  INSERT INTO proceso_seleccion (puesto, departamento, descripcion, fecha_creacion)
  VALUES ('Auxiliar veterinario', 'Clínica', 'Media jornada de tarde. Experiencia en manejo de animales.', NOW() - INTERVAL '12 days')
  RETURNING id_proceso INTO pr_aux;
  INSERT INTO proceso_seleccion (puesto, departamento, descripcion, estado, fecha_creacion)
  VALUES ('Peluquero canino', 'Peluquería', 'Jornada completa. Se valora certificado de peluquería canina.', 'cerrado', NOW() - INTERVAL '40 days')
  RETURNING id_proceso INTO pr_pelu;

  INSERT INTO candidato (id_proceso_fk, nombre, apellidos, correo, telefono, estado, notas, fecha_creacion) VALUES
    (pr_aux, 'Andrea', 'Castillo Rey', 'andrea.castillo@gmail.com', '611 200 300', 'oferta', 'Muy buena entrevista. Disponible en dos semanas.', NOW() - INTERVAL '10 days'),
    (pr_aux, 'Rubén', 'Iglesias Mora', 'ruben.iglesias@gmail.com', '611 300 400', 'entrevista', 'Entrevista el jueves a las 10:00.', NOW() - INTERVAL '8 days'),
    (pr_aux, 'Paula', 'Ortega Sanz', 'paula.ortega@hotmail.com', '611 400 500', 'recibido', NULL, NOW() - INTERVAL '3 days'),
    (pr_aux, 'Iván', 'Domínguez Cano', 'ivan.dominguez@gmail.com', '611 500 600', 'recibido', NULL, NOW() - INTERVAL '1 day'),
    (pr_pelu, 'Clara', 'Méndez Ríos', 'clara.mendez@gmail.com', '611 600 700', 'descartado', 'Busca otra zona.', NOW() - INTERVAL '35 days');
  INSERT INTO candidato (id_proceso_fk, nombre, apellidos, correo, telefono, estado, notas, fecha_creacion)
  VALUES (pr_pelu, 'Pablo', 'Moreno Díaz', 'pablo.moreno@gmail.com', '611 700 800', 'oferta', 'Aceptó la oferta.', NOW() - INTERVAL '38 days')
  RETURNING id_candidato INTO c_pablo;

  -- Contratación de Pablo (lo mismo que hace el botón "Contratar")
  INSERT INTO empleado (nombre, apellidos, correo, correo_personal, telefono, puesto, departamento, fecha_alta, id_candidato_fk)
  VALUES ('Pablo', 'Moreno Díaz', generar_correo('Pablo', 'Moreno Díaz'), 'pablo.moreno@gmail.com', '611 700 800',
          'Peluquero canino', 'Peluquería', CURRENT_DATE - 3, c_pablo)
  RETURNING id_empleado INTO e_pablo;
  UPDATE candidato SET estado = 'contratado', id_empleado_fk = e_pablo WHERE id_candidato = c_pablo;
  -- Su check de inicio va por la mitad
  UPDATE tarea_inicio SET completada = TRUE, fecha_completada = NOW() - INTERVAL '2 days', id_completada_por_fk = e_laura
  WHERE id_empleado_fk = e_pablo AND orden <= 3;

  -- ------------------------------------------------------------
  -- FICHAJES de las dos últimas semanas (días laborables)
  -- ------------------------------------------------------------
  FOR i IN 1..14 LOOP
    d := CURRENT_DATE - i;
    CONTINUE WHEN EXTRACT(ISODOW FROM d) > 5;
    INSERT INTO fichaje (id_empleado_fk, entrada, salida)
    SELECT e.id, d + TIME '08:00' + (e.retraso || ' minutes')::INTERVAL + ((i * 7 % 11) || ' minutes')::INTERVAL,
           d + e.fin + ((i * 5 % 17) || ' minutes')::INTERVAL
    FROM (VALUES (e_laura, 0, TIME '16:30'), (e_javier, 5, TIME '15:00'), (e_marta, 12, TIME '15:15'),
                 (e_sergio, 25, TIME '15:30'), (e_elena, 0, TIME '14:00')) AS e(id, retraso, fin)
    WHERE NOT (e.id = e_javier AND i BETWEEN 8 AND 9);  -- Javier estuvo de vacaciones
  END LOOP;
  FOR i IN 1..3 LOOP
    d := CURRENT_DATE - i;
    CONTINUE WHEN EXTRACT(ISODOW FROM d) > 5;
    INSERT INTO fichaje (id_empleado_fk, entrada, salida)
    VALUES (e_pablo, d + TIME '09:00', d + TIME '17:00');
  END LOOP;
  -- Hoy: algunos ya han fichado la entrada (Laura no, para que pruebes el botón)
  INSERT INTO fichaje (id_empleado_fk, entrada) VALUES
    (e_javier, CURRENT_DATE + TIME '08:04'), (e_marta, CURRENT_DATE + TIME '08:11'), (e_elena, CURRENT_DATE + TIME '07:58');

  -- ------------------------------------------------------------
  -- VACACIONES
  -- ------------------------------------------------------------
  INSERT INTO vacacion (id_empleado_fk, fecha_inicio, fecha_fin, motivo, estado, id_revisor_fk, fecha_revision, fecha_solicitud) VALUES
    (e_javier, CURRENT_DATE - 9, CURRENT_DATE - 8, 'Asuntos personales', 'aprobada', e_laura, NOW() - INTERVAL '20 days', NOW() - INTERVAL '25 days'),
    (e_javier, CURRENT_DATE + 20, CURRENT_DATE + 26, 'Viaje familiar', 'aprobada', e_laura, NOW() - INTERVAL '2 days', NOW() - INTERVAL '6 days'),
    (e_sergio, CURRENT_DATE + 5, CURRENT_DATE + 7, 'Puente', 'rechazada', e_laura, NOW() - INTERVAL '1 day', NOW() - INTERVAL '4 days');
  UPDATE vacacion SET comentario_revision = 'Esos días estamos cortos de personal, ¿puedes moverlo una semana?' WHERE estado = 'rechazada';
  INSERT INTO vacacion (id_empleado_fk, fecha_inicio, fecha_fin, motivo, fecha_solicitud) VALUES
    (e_marta, CURRENT_DATE + 30, CURRENT_DATE + 41, 'Vacaciones de verano', NOW() - INTERVAL '1 day'),
    (e_elena, CURRENT_DATE + 12, CURRENT_DATE + 13, 'Boda de un familiar', NOW() - INTERVAL '3 hours');

  -- ------------------------------------------------------------
  -- EVALUACIONES de los últimos trimestres
  -- ------------------------------------------------------------
  INSERT INTO evaluacion (id_empleado_fk, id_evaluador_fk, anio, trimestre, nota, comentario, fecha_creacion)
  SELECT e.id, e_laura,
         EXTRACT(YEAR FROM (CURRENT_DATE - (t.n * 3 || ' months')::INTERVAL))::SMALLINT,
         EXTRACT(QUARTER FROM (CURRENT_DATE - (t.n * 3 || ' months')::INTERVAL))::SMALLINT,
         e.notas[t.n], e.comentarios[t.n], NOW() - (t.n * 90 || ' days')::INTERVAL
  FROM (VALUES
    (e_javier, ARRAY[5, 4, 4], ARRAY['Referente del equipo en cirugía. Los clientes le piden por su nombre.', 'Muy buen trimestre, algo de retraso en los informes.', 'Buen trabajo, cumple con todo lo previsto.']),
    (e_marta, ARRAY[4, 4, 3], ARRAY['Ha mejorado mucho el trato con los clientes de granja.', 'Constante y fiable.', 'Necesita ganar agilidad en las consultas.']),
    (e_sergio, ARRAY[3, 4, 3], ARRAY['Llega tarde con frecuencia; hay que corregirlo.', 'Muy buena disposición y ayuda en todo.', 'Correcto, sin incidencias.']),
    (e_elena, ARRAY[5, 5, 4], ARRAY['La agenda nunca ha estado tan ordenada. Excelente.', 'Gestiona la recepción de forma impecable.', 'Buen arranque, aprende rápido.'])
  ) AS e(id, notas, comentarios)
  CROSS JOIN (VALUES (1), (2), (3)) AS t(n);

  -- ------------------------------------------------------------
  -- EMPRESAS
  -- ------------------------------------------------------------
  INSERT INTO empresa (nombre, sector, tipo_cliente, cif, telefono, correo, ciudad, id_responsable_fk, notas, fecha_creacion)
  VALUES ('Granja El Soto', 'Granja', 'convenio', 'B12345678', '925 111 000', 'info@granjaelsoto.es', 'Toledo', e_marta, 'Revisión mensual del ganado. Pagan a 30 días.', NOW() - INTERVAL '400 days')
  RETURNING id_empresa INTO em_soto;
  INSERT INTO empresa (nombre, sector, tipo_cliente, cif, telefono, correo, ciudad, id_responsable_fk, fecha_creacion)
  VALUES ('Criadero Los Almendros', 'Criadero', 'habitual', 'B23456789', '925 222 000', 'contacto@losalmendros.es', 'Illescas', e_javier, NOW() - INTERVAL '300 days')
  RETURNING id_empresa INTO em_almendros;
  INSERT INTO empresa (nombre, sector, tipo_cliente, cif, telefono, correo, ciudad, id_responsable_fk, notas, fecha_creacion)
  VALUES ('Protectora Huellas', 'Protectora', 'convenio', 'G34567890', '925 333 000', 'adopciones@huellas.org', 'Toledo', e_laura, 'Descuento del 20 % por convenio.', NOW() - INTERVAL '500 days')
  RETURNING id_empresa INTO em_huellas;
  INSERT INTO empresa (nombre, sector, tipo_cliente, cif, telefono, correo, ciudad, id_responsable_fk, fecha_creacion)
  VALUES ('Hípica La Dehesa', 'Hípica', 'habitual', 'B45678901', '925 444 000', 'hola@hipicaladehesa.es', 'Olías del Rey', e_javier, NOW() - INTERVAL '250 days')
  RETURNING id_empresa INTO em_dehesa;
  INSERT INTO empresa (nombre, sector, tipo_cliente, cif, telefono, correo, ciudad, id_responsable_fk, fecha_creacion)
  VALUES ('Tienda Animalia', 'Tienda', 'nuevo', 'B56789012', '925 555 000', 'tienda@animalia.es', 'Toledo', e_elena, NOW() - INTERVAL '20 days')
  RETURNING id_empresa INTO em_animalia;
  INSERT INTO empresa (nombre, sector, tipo_cliente, cif, telefono, correo, ciudad, id_responsable_fk, fecha_creacion)
  VALUES ('Residencia Canina El Bosque', 'Residencia', 'habitual', 'B67890123', '925 666 000', 'reservas@elbosque.es', 'Bargas', e_marta, NOW() - INTERVAL '180 days')
  RETURNING id_empresa INTO em_bosque;
  INSERT INTO empresa (nombre, sector, tipo_cliente, cif, telefono, correo, ciudad, id_responsable_fk, fecha_creacion)
  VALUES ('Quesería Montes', 'Granja', 'nuevo', 'B78901234', '925 777 000', 'queseria@montes.es', 'Sonseca', e_marta, NOW() - INTERVAL '9 days')
  RETURNING id_empresa INTO em_montes;
  INSERT INTO empresa (nombre, sector, tipo_cliente, cif, telefono, correo, ciudad, id_responsable_fk, fecha_creacion)
  VALUES ('Club Canino Norte', 'Club deportivo', 'nuevo', 'G89012345', '925 888 000', 'club@caninonorte.es', 'Toledo', e_sergio, NOW() - INTERVAL '5 days')
  RETURNING id_empresa INTO em_norte;

  -- Animales de empresa
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento, id_empresa_fk) VALUES
    ('Estrella', 'vaca', 'Frisona', 'hembra', CURRENT_DATE - 1500, em_soto),
    ('Lucero', 'vaca', 'Frisona', 'hembra', CURRENT_DATE - 1200, em_soto),
    ('Perla', 'oveja', 'Manchega', 'hembra', CURRENT_DATE - 800, em_soto),
    ('Thor', 'perro', 'Pastor alemán', 'macho', CURRENT_DATE - 900, em_almendros),
    ('Maya', 'perro', 'Pastor alemán', 'hembra', CURRENT_DATE - 700, em_almendros),
    ('Duna', 'perro', 'Golden retriever', 'hembra', CURRENT_DATE - 400, em_almendros),
    ('Chispa', 'perro', 'Mestizo', 'hembra', CURRENT_DATE - 300, em_huellas),
    ('Bruno', 'perro', 'Podenco', 'macho', CURRENT_DATE - 1000, em_huellas),
    ('Misi', 'gato', 'Común europeo', 'hembra', CURRENT_DATE - 200, em_huellas),
    ('Trueno', 'caballo', 'Pura raza española', 'macho', CURRENT_DATE - 3000, em_dehesa),
    ('Brisa', 'caballo', 'Árabe', 'hembra', CURRENT_DATE - 2500, em_dehesa),
    ('Pistacho', 'hurón', NULL, 'macho', CURRENT_DATE - 300, em_animalia),
    ('Rayo', 'perro', 'Border collie', 'macho', CURRENT_DATE - 1100, em_bosque),
    ('Nube', 'perro', 'Samoyedo', 'hembra', CURRENT_DATE - 600, em_bosque),
    ('Carmela', 'cabra', 'Murciano-granadina', 'hembra', CURRENT_DATE - 900, em_montes),
    ('Rulo', 'cabra', 'Murciano-granadina', 'macho', CURRENT_DATE - 1300, em_montes),
    ('Flecha', 'perro', 'Galgo', 'hembra', CURRENT_DATE - 700, em_norte),
    ('Atlas', 'perro', 'Malinois', 'macho', CURRENT_DATE - 1000, em_norte);
  SELECT id_animal INTO a_thor FROM animal WHERE nombre = 'Thor';
  SELECT id_animal INTO a_maya FROM animal WHERE nombre = 'Maya';
  SELECT id_animal INTO a_duna FROM animal WHERE nombre = 'Duna';
  SELECT id_animal INTO a_estrella FROM animal WHERE nombre = 'Estrella';
  SELECT id_animal INTO a_trueno FROM animal WHERE nombre = 'Trueno';

  -- ------------------------------------------------------------
  -- PARTICULARES Y SUS ANIMALES
  -- ------------------------------------------------------------
  INSERT INTO particular (nombre, apellidos, telefono, correo, ciudad, fecha_creacion) VALUES ('Lucía', 'Fernández Ruiz', '622 100 200', 'lucia.fernandez@gmail.com', 'Toledo', NOW() - INTERVAL '300 days') RETURNING id_particular INTO p_lucia;
  INSERT INTO particular (nombre, apellidos, telefono, correo, ciudad, fecha_creacion) VALUES ('Carlos', 'Gómez Herrera', '622 200 300', 'carlos.gomez@gmail.com', 'Toledo', NOW() - INTERVAL '250 days') RETURNING id_particular INTO p_carlos;
  INSERT INTO particular (nombre, apellidos, telefono, correo, ciudad, fecha_creacion) VALUES ('Ana', 'Martínez Soler', '622 300 400', 'ana.martinez@hotmail.com', 'Bargas', NOW() - INTERVAL '200 days') RETURNING id_particular INTO p_ana;
  INSERT INTO particular (nombre, apellidos, telefono, correo, ciudad, fecha_creacion) VALUES ('Diego', 'López Vega', '622 400 500', 'diego.lopez@gmail.com', 'Toledo', NOW() - INTERVAL '150 days') RETURNING id_particular INTO p_diego;
  INSERT INTO particular (nombre, apellidos, telefono, correo, ciudad, fecha_creacion) VALUES ('Raquel', 'Prieto Campos', '622 500 600', 'raquel.prieto@gmail.com', 'Olías del Rey', NOW() - INTERVAL '120 days') RETURNING id_particular INTO p_raquel;
  INSERT INTO particular (nombre, apellidos, telefono, correo, ciudad, fecha_creacion) VALUES ('Hugo', 'Martín Prieto', '622 600 700', 'hugo.martin@gmail.com', 'Olías del Rey', NOW() - INTERVAL '118 days') RETURNING id_particular INTO p_hugo;
  INSERT INTO particular (nombre, apellidos, telefono, correo, ciudad, fecha_creacion) VALUES ('Nuria', 'Sanz Molina', '622 700 800', 'nuria.sanz@yahoo.es', 'Toledo', NOW() - INTERVAL '90 days') RETURNING id_particular INTO p_nuria;
  INSERT INTO particular (nombre, apellidos, telefono, correo, ciudad, fecha_creacion) VALUES ('Andrés', 'Romero Blanco', '622 800 900', 'andres.romero@gmail.com', 'Sonseca', NOW() - INTERVAL '75 days') RETURNING id_particular INTO p_andres;
  INSERT INTO particular (nombre, apellidos, telefono, correo, ciudad, fecha_creacion) VALUES ('Sofía', 'Delgado Núñez', '622 900 100', 'sofia.delgado@gmail.com', 'Toledo', NOW() - INTERVAL '60 days') RETURNING id_particular INTO p_sofia;
  INSERT INTO particular (nombre, apellidos, telefono, correo, ciudad, fecha_creacion) VALUES ('Miguel', 'Herrero Pastor', '633 100 200', 'miguel.herrero@gmail.com', 'Toledo', NOW() - INTERVAL '45 days') RETURNING id_particular INTO p_miguel;
  INSERT INTO particular (nombre, apellidos, telefono, correo, ciudad, fecha_creacion) VALUES ('Irene', 'Vázquez Gil', '633 200 300', 'irene.vazquez@gmail.com', 'Bargas', NOW() - INTERVAL '30 days') RETURNING id_particular INTO p_irene;
  INSERT INTO particular (nombre, apellidos, telefono, correo, ciudad, fecha_creacion) VALUES ('Tomás', 'Cabrera León', '633 300 400', 'tomas.cabrera@gmail.com', 'Toledo', NOW() - INTERVAL '14 days') RETURNING id_particular INTO p_tomas;
  INSERT INTO particular (nombre, apellidos, telefono, correo, ciudad, fecha_creacion) VALUES ('Carmen', 'Rubio Ortiz', '633 400 500', 'carmen.rubio@gmail.com', 'Toledo', NOW() - INTERVAL '6 days') RETURNING id_particular INTO p_carmen;
  INSERT INTO particular (nombre, apellidos, telefono, correo, ciudad, fecha_creacion) VALUES ('Alberto', 'Serrano Cruz', '633 500 600', 'alberto.serrano@gmail.com', 'Toledo', NOW() - INTERVAL '2 days') RETURNING id_particular INTO p_alberto;

  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento, microchip) VALUES ('Kiko', 'perro', 'Beagle', 'macho', CURRENT_DATE - 1400, '941000024680135') RETURNING id_animal INTO a_kiko;
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento) VALUES ('Luna', 'gato', 'Siamés', 'hembra', CURRENT_DATE - 900) RETURNING id_animal INTO a_luna;
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento, microchip) VALUES ('Rocky', 'perro', 'Bulldog francés', 'macho', CURRENT_DATE - 1000, '941000011223344') RETURNING id_animal INTO a_rocky;
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento) VALUES ('Bimba', 'perro', 'Caniche', 'hembra', CURRENT_DATE - 2200) RETURNING id_animal INTO a_bimba;
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento) VALUES ('Garfield', 'gato', 'Persa', 'macho', CURRENT_DATE - 1800) RETURNING id_animal INTO a_garfield;
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento) VALUES ('Nala', 'perro', 'Labrador', 'hembra', CURRENT_DATE - 120) RETURNING id_animal INTO a_nala;
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento) VALUES ('Coco', 'conejo', 'Belier', 'macho', CURRENT_DATE - 500) RETURNING id_animal INTO a_coco;
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento) VALUES ('Tambor', 'conejo', 'Enano', 'macho', CURRENT_DATE - 700) RETURNING id_animal INTO a_tambor;
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento) VALUES ('Blanquita', 'cabra', 'Enana', 'hembra', CURRENT_DATE - 1100) RETURNING id_animal INTO a_blanquita;
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento) VALUES ('Simba', 'gato', 'Maine coon', 'macho', CURRENT_DATE - 600) RETURNING id_animal INTO a_simba;
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento) VALUES ('Toby', 'perro', 'Yorkshire', 'macho', CURRENT_DATE - 3000) RETURNING id_animal INTO a_toby;
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento) VALUES ('Mía', 'gato', 'Común europeo', 'hembra', CURRENT_DATE - 250) RETURNING id_animal INTO a_mia;
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento) VALUES ('Lola', 'perro', 'Teckel', 'hembra', CURRENT_DATE - 1600) RETURNING id_animal INTO a_lola;
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento) VALUES ('Rufo', 'perro', 'Mestizo', 'macho', CURRENT_DATE - 2600) RETURNING id_animal INTO a_rufo;
  INSERT INTO animal (nombre, especie, sexo, fecha_nacimiento) VALUES ('Pipo', 'periquito', 'macho', CURRENT_DATE - 400) RETURNING id_animal INTO a_pipo;
  INSERT INTO animal (nombre, especie, raza, sexo, fecha_nacimiento) VALUES ('Canela', 'perro', 'Cocker', 'hembra', CURRENT_DATE - 1900) RETURNING id_animal INTO a_canela;

  INSERT INTO animal_particular (id_animal_fk, id_particular_fk) VALUES
    (a_kiko, p_lucia), (a_luna, p_lucia),
    (a_rocky, p_carlos),
    (a_toby, p_ana), (a_mia, p_ana),
    (a_bimba, p_diego),
    (a_garfield, p_raquel), (a_garfield, p_hugo),          -- gato compartido por la pareja
    (a_coco, p_nuria), (a_tambor, p_nuria),
    (a_blanquita, p_andres),
    (a_simba, p_sofia),
    (a_lola, p_miguel),
    (a_nala, p_irene),
    (a_rufo, p_tomas),
    (a_pipo, p_carmen),
    (a_canela, p_alberto);

  -- ------------------------------------------------------------
  -- OPORTUNIDADES
  -- ------------------------------------------------------------
  INSERT INTO oportunidad (titulo, mensaje, estado, servicio, valor, origen, id_particular_fk, id_animal_fk, id_responsable_fk,
                           nombre_contacto, correo_contacto, telefono_contacto, nombre_animal, especie_animal, consentimiento, fecha_creacion) VALUES
    ('Vacunación · Pipo', 'Hola, quería saber si vacunáis periquitos y qué precio tiene. Gracias.', 'nuevo', 'Vacunación', 45, 'web', p_carmen, a_pipo, NULL,
     'Carmen Rubio Ortiz', 'carmen.rubio@gmail.com', '633 400 500', 'Pipo', 'periquito', TRUE, NOW() - INTERVAL '5 hours'),
    ('Revisión · Canela', 'Canela lleva dos días cojeando de la pata trasera. ¿Tenéis hueco esta semana?', 'nuevo', 'Consulta general', 35, 'web', p_alberto, a_canela, NULL,
     'Alberto Serrano Cruz', 'alberto.serrano@gmail.com', '633 500 600', 'Canela', 'perro', TRUE, NOW() - INTERVAL '1 day'),
    ('Esterilización · Nala', 'Quiero pedir presupuesto para esterilizar a Nala cuando tenga la edad.', 'contactado', 'Esterilización', 220, 'web', p_irene, a_nala, e_marta,
     'Irene Vázquez Gil', 'irene.vazquez@gmail.com', '633 200 300', 'Nala', 'perro', TRUE, NOW() - INTERVAL '4 days');

  INSERT INTO oportunidad (titulo, mensaje, estado, servicio, valor, origen, id_particular_fk, id_animal_fk, id_responsable_fk, fecha_cita, hora_cita, fecha_seguimiento, fecha_creacion) VALUES
    ('Vacunas anuales · Kiko', 'Toca la vacuna anual y la de la rabia.', 'cita', 'Vacunación', 45, 'telefono', p_lucia, a_kiko, e_javier, CURRENT_DATE + 1, '10:30', NULL, NOW() - INTERVAL '6 days'),
    ('Cirugía dental · Rocky', 'Necesita limpieza de boca con anestesia.', 'presupuesto', 'Cirugía', 380, 'presencial', p_carlos, a_rocky, e_javier, NULL, NULL, CURRENT_DATE + 2, NOW() - INTERVAL '10 days'),
    ('Análisis de sangre · Toby', 'Revisión geriátrica completa.', 'cita', 'Análisis y pruebas', 95, 'telefono', p_ana, a_toby, e_marta, CURRENT_DATE, '17:00', NULL, NOW() - INTERVAL '8 days'),
    ('Peluquería · Bimba', 'Corte y baño.', 'atendido', 'Peluquería', 30, 'presencial', p_diego, a_bimba, e_sergio, CURRENT_DATE - 12, '12:00', NULL, NOW() - INTERVAL '20 days'),
    ('Revisión · Garfield', 'Vomita a menudo, queremos que lo vean.', 'contactado', 'Consulta general', 35, 'email', p_raquel, a_garfield, e_marta, NULL, NULL, CURRENT_DATE - 1, NOW() - INTERVAL '7 days'),
    ('Desparasitación · Coco y Tambor', 'Desparasitar a los dos conejos.', 'atendido', 'Desparasitación', 50, 'telefono', p_nuria, a_coco, e_sergio, CURRENT_DATE - 30, '11:00', NULL, NOW() - INTERVAL '40 days'),
    ('Revisión · Blanquita', 'Cabra enana con poco apetito.', 'descartado', 'Consulta general', 35, 'telefono', p_andres, a_blanquita, e_marta, NULL, NULL, NULL, NOW() - INTERVAL '35 days'),
    ('Chip · Simba', 'Poner el microchip antes del viaje.', 'cita', 'Chip e identificación', 40, 'web', p_sofia, a_simba, e_elena, CURRENT_DATE + 3, '09:30', NULL, NOW() - INTERVAL '3 days'),
    ('Esterilización · Mía', 'Esterilizar a la gata.', 'presupuesto', 'Esterilización', 180, 'presencial', p_ana, a_mia, e_javier, NULL, NULL, CURRENT_DATE + 5, NOW() - INTERVAL '9 days'),
    ('Urgencia · Lola', 'Se ha comido un calcetín.', 'atendido', 'Urgencias', 260, 'telefono', p_miguel, a_lola, e_javier, CURRENT_DATE - 44, '22:00', NULL, NOW() - INTERVAL '44 days'),
    ('Vacunación · Rufo', 'Vacuna de la rabia.', 'nuevo', 'Vacunación', 45, 'telefono', p_tomas, a_rufo, NULL, NULL, NULL, CURRENT_DATE, NOW() - INTERVAL '2 days');
  UPDATE oportunidad SET motivo_descarte = 'Se lo lleva a otra clínica' WHERE titulo = 'Revisión · Blanquita';

  INSERT INTO oportunidad (titulo, mensaje, estado, servicio, valor, probabilidad, origen, id_empresa_fk, id_animal_fk, id_responsable_fk, fecha_cita, hora_cita, fecha_seguimiento, fecha_creacion) VALUES
    ('Revisión mensual del ganado', 'Revisión de octubre de todo el ganado.', 'cita', 'Revisión de granja', 180, 80, 'email', em_soto, a_estrella, e_marta, CURRENT_DATE + 2, '08:30', NULL, NOW() - INTERVAL '15 days'),
    ('Vacunación de la camada', 'Camada de 6 cachorros de pastor alemán.', 'presupuesto', 'Vacunación', 270, 60, 'telefono', em_almendros, a_maya, e_javier, NULL, NULL, CURRENT_DATE + 1, NOW() - INTERVAL '11 days'),
    ('Pruebas de displasia', 'Radiografías de cadera a los reproductores.', 'contactado', 'Análisis y pruebas', 320, 35, 'email', em_almendros, a_thor, e_javier, NULL, NULL, CURRENT_DATE - 2, NOW() - INTERVAL '18 days'),
    ('Esterilizaciones de adopción', 'Lote de 8 esterilizaciones con precio de convenio.', 'presupuesto', 'Esterilización', 1400, 70, 'presencial', em_huellas, NULL, e_laura, NULL, NULL, CURRENT_DATE + 4, NOW() - INTERVAL '13 days'),
    ('Vacunas de nuevas adopciones', 'Tres perros recién llegados.', 'atendido', 'Vacunación', 135, NULL, 'email', em_huellas, NULL, e_sergio, CURRENT_DATE - 16, '10:00', NULL, NOW() - INTERVAL '25 days'),
    ('Revisión de cascos y dientes', 'Revisión semestral de los caballos.', 'cita', 'Revisión de granja', 450, 85, 'telefono', em_dehesa, a_trueno, e_javier, CURRENT_DATE + 6, '09:00', NULL, NOW() - INTERVAL '9 days'),
    ('Convenio de venta de pienso', 'Quieren recomendar la clínica en la tienda a cambio de descuento.', 'nuevo', NULL, 0, NULL, 'email', em_animalia, NULL, e_elena, NULL, NULL, CURRENT_DATE + 1, NOW() - INTERVAL '2 days'),
    ('Revisión de huéspedes', 'Revisión sanitaria de los perros alojados en temporada alta.', 'atendido', 'Consulta general', 420, NULL, 'presencial', em_bosque, NULL, e_marta, CURRENT_DATE - 60, '09:00', NULL, NOW() - INTERVAL '70 days'),
    ('Plan sanitario del rebaño', 'Primer contacto: quieren un plan anual para las cabras.', 'contactado', 'Revisión de granja', 900, 40, 'telefono', em_montes, NULL, e_marta, NULL, NULL, CURRENT_DATE + 3, NOW() - INTERVAL '8 days'),
    ('Certificados para competición', 'Certificados de salud para 12 perros del club.', 'nuevo', 'Consulta general', 480, NULL, 'email', em_norte, NULL, e_sergio, NULL, NULL, CURRENT_DATE + 2, NOW() - INTERVAL '4 days'),
    ('Cirugía de Duna', 'Operación de ligamento cruzado.', 'descartado', 'Cirugía', 950, NULL, 'telefono', em_almendros, a_duna, e_javier, NULL, NULL, NULL, NOW() - INTERVAL '50 days');
  UPDATE oportunidad SET motivo_descarte = 'Precio demasiado alto' WHERE titulo = 'Cirugía de Duna';

  -- Algo de historial (llamadas y notas) en varias oportunidades
  FOR o IN SELECT id_oportunidad FROM oportunidad WHERE estado IN ('contactado', 'presupuesto', 'cita', 'atendido') LOOP
    INSERT INTO actividad (id_oportunidad_fk, id_empleado_fk, tipo, descripcion, fecha)
    SELECT o, COALESCE(op.id_responsable_fk, e_elena), 'llamada', 'Llamada para confirmar los detalles. Todo correcto.',
           op.fecha_creacion + INTERVAL '1 day'
    FROM oportunidad op WHERE op.id_oportunidad = o;
  END LOOP;
  FOR o IN SELECT id_oportunidad FROM oportunidad WHERE estado = 'presupuesto' LOOP
    INSERT INTO actividad (id_oportunidad_fk, id_empleado_fk, tipo, descripcion, fecha)
    SELECT o, op.id_responsable_fk, 'email', 'Presupuesto enviado por correo.', op.fecha_creacion + INTERVAL '2 days'
    FROM oportunidad op WHERE op.id_oportunidad = o;
  END LOOP;
  -- La fecha de "creada" del historial coincide con la de la oportunidad
  UPDATE actividad a SET fecha = op.fecha_creacion
  FROM oportunidad op WHERE a.id_oportunidad_fk = op.id_oportunidad AND a.tipo = 'sistema';
END $$;
