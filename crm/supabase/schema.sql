-- ============================================================
-- CRM MI MASCOTA - Schema SQL completo
-- Ejecutar en Supabase SQL Editor (se puede volver a ejecutar:
-- borra las tablas y las crea de nuevo, así que se pierden los datos)
-- Después, si quieres datos de prueba, ejecuta datos_ejemplo.sql
-- ============================================================

-- ============================================================
-- LIMPIEZA (tablas de esta versión y de la versión anterior del CRM)
-- ============================================================

DROP TABLE IF EXISTS nomina, evaluacion, tarea_inicio, vacacion, fichaje, candidato,
  proceso_seleccion, actividad, oportunidad, animal_particular, animal, particular,
  empresa, empleado, tarea_inicio_plantilla, servicio CASCADE;

DROP TABLE IF EXISTS actividades, oportunidades, mascota_propietarios, mascotas,
  particulares, empresas, empleados CASCADE;
DROP FUNCTION IF EXISTS set_updated_at, log_oportunidad, vincular_empresa,
  comprobar_propietario, comprobar_mascota_empresa CASCADE;

-- ============================================================
-- CATÁLOGOS
-- ============================================================

CREATE TABLE servicio (
  id_servicio UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(120) NOT NULL UNIQUE,
  precio_base DECIMAL(10,2) NOT NULL DEFAULT 0
);

-- Tareas que se crean solas a cada trabajador nuevo (check de inicio)
CREATE TABLE tarea_inicio_plantilla (
  id_plantilla UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion VARCHAR(200) NOT NULL,
  orden SMALLINT NOT NULL DEFAULT 0
);

-- ============================================================
-- EMPLEADOS (RRHH)
-- ============================================================
-- El correo es el mismo con el que la persona inicia sesión en el CRM.
-- rol 'admin' puede conceder vacaciones, evaluar, contratar, subir nóminas…

CREATE TABLE empleado (
  id_empleado UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellidos VARCHAR(150),
  correo VARCHAR(255) NOT NULL UNIQUE,
  correo_personal VARCHAR(255),
  telefono VARCHAR(30),
  foto TEXT,
  puesto VARCHAR(100) NOT NULL,
  departamento VARCHAR(100),
  rol VARCHAR(20) NOT NULL DEFAULT 'empleado' CHECK (rol IN ('admin', 'empleado')),
  dias_vacaciones SMALLINT NOT NULL DEFAULT 22 CHECK (dias_vacaciones BETWEEN 0 AND 60),
  fecha_alta DATE NOT NULL DEFAULT CURRENT_DATE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  id_candidato_fk UUID,                 -- si entró por un proceso de selección
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CLIENTES: EMPRESAS, PARTICULARES Y ANIMALES
-- ============================================================

CREATE TABLE empresa (
  id_empresa UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(160) NOT NULL,
  logo TEXT,
  sector VARCHAR(60),                   -- Granja, Criadero, Protectora, Tienda…
  tipo_cliente VARCHAR(20) NOT NULL DEFAULT 'nuevo'
    CHECK (tipo_cliente IN ('nuevo', 'habitual', 'convenio')),
  cif VARCHAR(20),
  telefono VARCHAR(30),
  correo VARCHAR(255),
  ciudad VARCHAR(100),
  direccion VARCHAR(200),
  id_responsable_fk UUID REFERENCES empleado(id_empleado) ON DELETE SET NULL,
  notas TEXT,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE particular (
  id_particular UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  apellidos VARCHAR(150),
  telefono VARCHAR(30),
  correo VARCHAR(255),
  ciudad VARCHAR(100),
  notas TEXT,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Un animal es de una empresa (id_empresa_fk) o de uno o varios particulares (animal_particular)
CREATE TABLE animal (
  id_animal UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(80) NOT NULL,
  especie VARCHAR(40) NOT NULL,         -- texto libre: perro, gato, papagayo…
  raza VARCHAR(80),
  sexo VARCHAR(10) CHECK (sexo IN ('macho', 'hembra')),
  fecha_nacimiento DATE,
  microchip VARCHAR(30),
  foto TEXT,
  id_empresa_fk UUID REFERENCES empresa(id_empresa) ON DELETE CASCADE,
  notas TEXT,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pivote N:M: una persona puede tener varios animales y un animal varias personas
CREATE TABLE animal_particular (
  id_animal_particular UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_animal_fk UUID NOT NULL REFERENCES animal(id_animal) ON DELETE CASCADE,
  id_particular_fk UUID NOT NULL REFERENCES particular(id_particular) ON DELETE CASCADE,
  UNIQUE (id_animal_fk, id_particular_fk)
);

-- ============================================================
-- OPORTUNIDADES Y ACTIVIDAD
-- ============================================================

CREATE TABLE oportunidad (
  id_oportunidad UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(200) NOT NULL,
  mensaje TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'nuevo'
    CHECK (estado IN ('nuevo', 'contactado', 'presupuesto', 'cita', 'atendido', 'descartado')),
  servicio VARCHAR(120),
  valor DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  probabilidad SMALLINT CHECK (probabilidad BETWEEN 0 AND 100),
  origen VARCHAR(20) NOT NULL DEFAULT 'manual'
    CHECK (origen IN ('web', 'telefono', 'email', 'presencial', 'manual')),
  id_empresa_fk UUID REFERENCES empresa(id_empresa) ON DELETE SET NULL,
  id_particular_fk UUID REFERENCES particular(id_particular) ON DELETE SET NULL,
  id_animal_fk UUID REFERENCES animal(id_animal) ON DELETE SET NULL,
  id_responsable_fk UUID REFERENCES empleado(id_empleado) ON DELETE SET NULL,
  -- Datos tal y como llegan del formulario de la web
  nombre_contacto VARCHAR(120),
  correo_contacto VARCHAR(255),
  telefono_contacto VARCHAR(40),
  nombre_animal VARCHAR(80),
  especie_animal VARCHAR(40),
  consentimiento BOOLEAN NOT NULL DEFAULT FALSE,
  -- Agenda
  fecha_cita DATE,
  hora_cita TIME,
  fecha_seguimiento DATE,               -- próximo contacto
  motivo_descarte VARCHAR(200),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE actividad (
  id_actividad UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_oportunidad_fk UUID NOT NULL REFERENCES oportunidad(id_oportunidad) ON DELETE CASCADE,
  id_empleado_fk UUID REFERENCES empleado(id_empleado) ON DELETE SET NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'nota'
    CHECK (tipo IN ('nota', 'llamada', 'email', 'cita', 'estado', 'sistema')),
  descripcion TEXT NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RRHH: FICHAJES, VACACIONES, CHECK DE INICIO
-- ============================================================

CREATE TABLE fichaje (
  id_fichaje UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empleado_fk UUID NOT NULL REFERENCES empleado(id_empleado) ON DELETE CASCADE,
  entrada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  salida TIMESTAMPTZ,
  CHECK (salida IS NULL OR salida > entrada)
);
-- Solo puede haber un fichaje abierto (sin salida) por trabajador
CREATE UNIQUE INDEX fichaje_abierto_unico ON fichaje (id_empleado_fk) WHERE salida IS NULL;

CREATE TABLE vacacion (
  id_vacacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empleado_fk UUID NOT NULL REFERENCES empleado(id_empleado) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias SMALLINT NOT NULL DEFAULT 0,     -- días laborables (lo calcula un trigger)
  motivo VARCHAR(200),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  id_revisor_fk UUID REFERENCES empleado(id_empleado) ON DELETE SET NULL,
  comentario_revision VARCHAR(300),
  fecha_solicitud TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_revision TIMESTAMPTZ,
  CHECK (fecha_fin >= fecha_inicio)
);

CREATE TABLE tarea_inicio (
  id_tarea UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empleado_fk UUID NOT NULL REFERENCES empleado(id_empleado) ON DELETE CASCADE,
  descripcion VARCHAR(200) NOT NULL,
  orden SMALLINT NOT NULL DEFAULT 0,
  completada BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_completada TIMESTAMPTZ,
  id_completada_por_fk UUID REFERENCES empleado(id_empleado) ON DELETE SET NULL
);

-- ============================================================
-- RRHH: SELECCIÓN (procesos de admisión con CV)
-- ============================================================

CREATE TABLE proceso_seleccion (
  id_proceso UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  puesto VARCHAR(100) NOT NULL,
  departamento VARCHAR(100),
  descripcion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE candidato (
  id_candidato UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_proceso_fk UUID NOT NULL REFERENCES proceso_seleccion(id_proceso) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  apellidos VARCHAR(150),
  correo VARCHAR(255) NOT NULL,
  telefono VARCHAR(30),
  cv TEXT,                              -- ruta del PDF en el bucket 'cvs'
  estado VARCHAR(20) NOT NULL DEFAULT 'recibido'
    CHECK (estado IN ('recibido', 'entrevista', 'oferta', 'contratado', 'descartado')),
  notas TEXT,
  id_empleado_fk UUID REFERENCES empleado(id_empleado) ON DELETE SET NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE empleado ADD CONSTRAINT empleado_candidato_fk
  FOREIGN KEY (id_candidato_fk) REFERENCES candidato(id_candidato) ON DELETE SET NULL;

-- ============================================================
-- RRHH: EVALUACIONES Y NÓMINAS
-- ============================================================

CREATE TABLE evaluacion (
  id_evaluacion UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empleado_fk UUID NOT NULL REFERENCES empleado(id_empleado) ON DELETE CASCADE,
  id_evaluador_fk UUID REFERENCES empleado(id_empleado) ON DELETE SET NULL,
  anio SMALLINT NOT NULL,
  trimestre SMALLINT NOT NULL CHECK (trimestre BETWEEN 1 AND 4),
  nota SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT NOT NULL,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_empleado_fk, anio, trimestre)
);

CREATE TABLE nomina (
  id_nomina UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empleado_fk UUID NOT NULL REFERENCES empleado(id_empleado) ON DELETE CASCADE,
  anio SMALLINT NOT NULL,
  mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  archivo TEXT NOT NULL,                -- ruta del PDF en el bucket 'nominas'
  importe_neto DECIMAL(10,2),
  firmada BOOLEAN NOT NULL DEFAULT FALSE,
  firma TEXT,                           -- imagen de la firma (PNG en base64)
  fecha_firma TIMESTAMPTZ,
  fecha_subida TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_empleado_fk, anio, mes)
);

-- ============================================================
-- DATOS INICIALES - Catálogos
-- ============================================================

INSERT INTO servicio (nombre, precio_base) VALUES
  ('Consulta general', 35), ('Vacunación', 45), ('Desparasitación', 25),
  ('Cirugía', 350), ('Esterilización', 220), ('Análisis y pruebas', 80),
  ('Peluquería', 30), ('Urgencias', 90), ('Revisión de granja', 180),
  ('Chip e identificación', 40);

INSERT INTO tarea_inicio_plantilla (descripcion, orden) VALUES
  ('Crear el correo corporativo', 1),
  ('Crear el usuario del CRM', 2),
  ('Entregar el portátil', 3),
  ('Entregar uniforme y tarjeta de acceso', 4),
  ('Firmar el contrato y la protección de datos', 5),
  ('Formación en prevención de riesgos', 6),
  ('Presentación al equipo', 7);

-- ============================================================
-- FUNCIONES DE PERMISOS
-- ============================================================
-- El trabajador que ha iniciado sesión se busca por su correo.

CREATE OR REPLACE FUNCTION mi_empleado()
RETURNS UUID AS $$
  SELECT id_empleado FROM public.empleado
  WHERE LOWER(correo) = LOWER(auth.jwt() ->> 'email') AND activo
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION es_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.empleado
    WHERE LOWER(correo) = LOWER(auth.jwt() ->> 'email') AND activo AND rol = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Dominio de los correos corporativos que se crean al contratar
CREATE OR REPLACE FUNCTION dominio_correo()
RETURNS TEXT AS $$ SELECT 'mimascota.es'::TEXT $$ LANGUAGE sql IMMUTABLE;

-- ============================================================
-- FUNCIÓN: probabilidad por defecto según el estado
-- ============================================================

CREATE OR REPLACE FUNCTION probabilidad_estado(p_estado TEXT)
RETURNS SMALLINT AS $$
  SELECT (CASE p_estado
    WHEN 'nuevo' THEN 10 WHEN 'contactado' THEN 30 WHEN 'presupuesto' THEN 50
    WHEN 'cita' THEN 75 WHEN 'atendido' THEN 100 ELSE 0 END)::SMALLINT;
$$ LANGUAGE sql IMMUTABLE;

-- ============================================================
-- TRIGGER: preparar oportunidad (fechas, probabilidad, título)
-- ============================================================

CREATE OR REPLACE FUNCTION preparar_oportunidad()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion := NOW();
  IF TG_OP = 'INSERT' THEN
    IF NEW.probabilidad IS NULL THEN NEW.probabilidad := probabilidad_estado(NEW.estado); END IF;
  ELSIF NEW.estado IS DISTINCT FROM OLD.estado AND NEW.probabilidad IS NOT DISTINCT FROM OLD.probabilidad THEN
    NEW.probabilidad := probabilidad_estado(NEW.estado);
  END IF;
  IF NEW.estado <> 'descartado' THEN NEW.motivo_descarte := NULL; END IF;
  IF NEW.titulo IS NULL OR TRIM(NEW.titulo) = '' THEN
    NEW.titulo := COALESCE(NEW.servicio, 'Consulta')
      || COALESCE(' · ' || INITCAP(NULLIF(TRIM(NEW.nombre_animal), '')), '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_preparar_oportunidad
BEFORE INSERT OR UPDATE ON oportunidad
FOR EACH ROW EXECUTE FUNCTION preparar_oportunidad();

-- ============================================================
-- TRIGGER: vincular lo que llega de la web con el particular y su animal
-- ============================================================
-- Busca a la persona por correo o teléfono (si no existe la crea) y busca
-- su animal por nombre (si no existe lo crea y lo asocia a la persona).

CREATE OR REPLACE FUNCTION vincular_cliente()
RETURNS TRIGGER AS $$
DECLARE
  v_particular UUID;
  v_animal UUID;
  v_tel TEXT := REGEXP_REPLACE(COALESCE(NEW.telefono_contacto, ''), '\D', '', 'g');
BEGIN
  IF NEW.id_particular_fk IS NOT NULL OR NEW.id_empresa_fk IS NOT NULL
     OR COALESCE(NEW.nombre_contacto, '') = '' THEN
    RETURN NEW;
  END IF;

  SELECT id_particular INTO v_particular FROM particular
  WHERE (NEW.correo_contacto IS NOT NULL AND LOWER(correo) = LOWER(NEW.correo_contacto))
     OR (LENGTH(v_tel) >= 9 AND REGEXP_REPLACE(COALESCE(telefono, ''), '\D', '', 'g') = v_tel)
  ORDER BY fecha_creacion LIMIT 1;

  IF v_particular IS NULL THEN
    INSERT INTO particular (nombre, apellidos, correo, telefono)
    VALUES (SPLIT_PART(TRIM(NEW.nombre_contacto), ' ', 1),
            CASE WHEN POSITION(' ' IN TRIM(NEW.nombre_contacto)) > 0
              THEN TRIM(SUBSTRING(TRIM(NEW.nombre_contacto) FROM POSITION(' ' IN TRIM(NEW.nombre_contacto)) + 1))
            END,
            LOWER(NEW.correo_contacto), NEW.telefono_contacto)
    RETURNING id_particular INTO v_particular;
  END IF;
  NEW.id_particular_fk := v_particular;

  IF COALESCE(TRIM(NEW.nombre_animal), '') <> '' THEN
    SELECT a.id_animal INTO v_animal FROM animal a
    JOIN animal_particular ap ON ap.id_animal_fk = a.id_animal
    WHERE ap.id_particular_fk = v_particular AND LOWER(a.nombre) = LOWER(TRIM(NEW.nombre_animal))
    LIMIT 1;

    IF v_animal IS NULL THEN
      INSERT INTO animal (nombre, especie)
      VALUES (INITCAP(TRIM(NEW.nombre_animal)), COALESCE(NULLIF(LOWER(TRIM(NEW.especie_animal)), ''), 'sin indicar'))
      RETURNING id_animal INTO v_animal;
      INSERT INTO animal_particular (id_animal_fk, id_particular_fk) VALUES (v_animal, v_particular);
    END IF;
    NEW.id_animal_fk := v_animal;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_vincular_cliente
BEFORE INSERT ON oportunidad
FOR EACH ROW EXECUTE FUNCTION vincular_cliente();

-- ============================================================
-- TRIGGER: historial automático de cada oportunidad
-- ============================================================

CREATE OR REPLACE FUNCTION registrar_actividad()
RETURNS TRIGGER AS $$
DECLARE
  etiquetas JSONB := '{"nuevo":"Nuevo","contactado":"Contactado","presupuesto":"Presupuesto","cita":"Cita","atendido":"Atendido","descartado":"Descartado"}';
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO actividad (id_oportunidad_fk, id_empleado_fk, tipo, descripcion)
    VALUES (NEW.id_oportunidad, mi_empleado(), 'sistema',
      CASE WHEN NEW.origen = 'web' THEN 'Oportunidad recibida desde el formulario de la web'
           ELSE 'Oportunidad creada' END);
    RETURN NEW;
  END IF;

  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO actividad (id_oportunidad_fk, id_empleado_fk, tipo, descripcion)
    VALUES (NEW.id_oportunidad, mi_empleado(), 'estado',
      (etiquetas ->> OLD.estado) || ' → ' || (etiquetas ->> NEW.estado)
      || COALESCE(' (' || NEW.motivo_descarte || ')', ''));
  END IF;

  IF NEW.fecha_cita IS NOT NULL AND (NEW.fecha_cita IS DISTINCT FROM OLD.fecha_cita
     OR NEW.hora_cita IS DISTINCT FROM OLD.hora_cita) THEN
    INSERT INTO actividad (id_oportunidad_fk, id_empleado_fk, tipo, descripcion)
    VALUES (NEW.id_oportunidad, mi_empleado(), 'cita',
      'Cita el ' || TO_CHAR(NEW.fecha_cita, 'DD/MM/YYYY')
      || COALESCE(' a las ' || TO_CHAR(NEW.hora_cita, 'HH24:MI'), ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_registrar_actividad
AFTER INSERT OR UPDATE ON oportunidad
FOR EACH ROW EXECUTE FUNCTION registrar_actividad();

-- ============================================================
-- TRIGGERS: un animal de empresa no puede tener dueños particulares
-- ============================================================

CREATE OR REPLACE FUNCTION comprobar_animal_particular()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM animal WHERE id_animal = NEW.id_animal_fk AND id_empresa_fk IS NOT NULL) THEN
    RAISE EXCEPTION 'Este animal pertenece a una empresa y no puede tener dueños particulares';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comprobar_animal_particular
BEFORE INSERT OR UPDATE ON animal_particular
FOR EACH ROW EXECUTE FUNCTION comprobar_animal_particular();

CREATE OR REPLACE FUNCTION comprobar_animal_empresa()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.id_empresa_fk IS NOT NULL
     AND EXISTS (SELECT 1 FROM animal_particular WHERE id_animal_fk = NEW.id_animal) THEN
    RAISE EXCEPTION 'Este animal tiene dueños particulares: quítalos antes de asignarlo a una empresa';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comprobar_animal_empresa
BEFORE UPDATE OF id_empresa_fk ON animal
FOR EACH ROW EXECUTE FUNCTION comprobar_animal_empresa();

-- ============================================================
-- TRIGGERS: empleados (correo en minúsculas y check de inicio)
-- ============================================================

CREATE OR REPLACE FUNCTION normalizar_empleado()
RETURNS TRIGGER AS $$
BEGIN
  NEW.correo := LOWER(TRIM(NEW.correo));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_normalizar_empleado
BEFORE INSERT OR UPDATE OF correo ON empleado
FOR EACH ROW EXECUTE FUNCTION normalizar_empleado();

CREATE OR REPLACE FUNCTION crear_tareas_inicio()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO tarea_inicio (id_empleado_fk, descripcion, orden)
  SELECT NEW.id_empleado, descripcion, orden FROM tarea_inicio_plantilla;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_crear_tareas_inicio
AFTER INSERT ON empleado
FOR EACH ROW EXECUTE FUNCTION crear_tareas_inicio();

-- ============================================================
-- TRIGGER: vacaciones (días laborables y quién las revisa)
-- ============================================================

CREATE OR REPLACE FUNCTION dias_laborables(p_inicio DATE, p_fin DATE)
RETURNS INT AS $$
  SELECT COUNT(*)::INT FROM GENERATE_SERIES(p_inicio, p_fin, INTERVAL '1 day') AS d
  WHERE EXTRACT(ISODOW FROM d) < 6;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION preparar_vacacion()
RETURNS TRIGGER AS $$
BEGIN
  NEW.dias := dias_laborables(NEW.fecha_inicio, NEW.fecha_fin);
  IF NEW.dias = 0 THEN
    RAISE EXCEPTION 'Las fechas elegidas no incluyen ningún día laborable';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado <> 'pendiente' THEN
    NEW.fecha_revision := NOW();
    NEW.id_revisor_fk := COALESCE(mi_empleado(), NEW.id_revisor_fk);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_preparar_vacacion
BEFORE INSERT OR UPDATE ON vacacion
FOR EACH ROW EXECUTE FUNCTION preparar_vacacion();

-- ============================================================
-- FUNCIÓN: fichar entrada o salida (el trabajador que ha iniciado sesión)
-- ============================================================
-- Si tiene un fichaje abierto lo cierra (salida); si no, abre uno nuevo (entrada).

CREATE OR REPLACE FUNCTION fichar()
RETURNS fichaje AS $$
DECLARE
  v_empleado UUID := mi_empleado();
  v_fichaje fichaje;
BEGIN
  IF v_empleado IS NULL THEN
    RAISE EXCEPTION 'Tu usuario no está vinculado a ninguna ficha de empleado';
  END IF;
  UPDATE fichaje SET salida = NOW()
  WHERE id_empleado_fk = v_empleado AND salida IS NULL
  RETURNING * INTO v_fichaje;
  IF NOT FOUND THEN
    INSERT INTO fichaje (id_empleado_fk) VALUES (v_empleado) RETURNING * INTO v_fichaje;
  END IF;
  RETURN v_fichaje;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- FUNCIÓN: contratar a un candidato
-- ============================================================
-- Crea su ficha de empleado con un correo corporativo (nombre.apellido@dominio)
-- y el trigger de empleado le crea las tareas del check de inicio.

CREATE OR REPLACE FUNCTION generar_correo(p_nombre TEXT, p_apellidos TEXT)
RETURNS TEXT AS $$
DECLARE
  v_base TEXT;
  v_correo TEXT;
  n INT := 1;
BEGIN
  v_base := LOWER(TRANSLATE(
    SPLIT_PART(TRIM(p_nombre), ' ', 1) || '.' || SPLIT_PART(TRIM(COALESCE(p_apellidos, '')), ' ', 1),
    'ÁÉÍÓÚÜÑÀÈÌÒÙáéíóúüñàèìòùç', 'AEIOUUNAEIOUaeiouunaeiouc'));
  v_base := TRIM(BOTH '.' FROM REGEXP_REPLACE(v_base, '[^a-z0-9.]', '', 'g'));
  v_correo := v_base || '@' || dominio_correo();
  WHILE EXISTS (SELECT 1 FROM empleado WHERE correo = v_correo) LOOP
    n := n + 1;
    v_correo := v_base || n || '@' || dominio_correo();
  END LOOP;
  RETURN v_correo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION contratar_candidato(p_id_candidato UUID, p_fecha_alta DATE DEFAULT CURRENT_DATE)
RETURNS UUID AS $$
DECLARE
  c candidato;
  p proceso_seleccion;
  v_empleado UUID;
BEGIN
  IF NOT es_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede contratar';
  END IF;
  SELECT * INTO c FROM candidato WHERE id_candidato = p_id_candidato;
  IF NOT FOUND THEN RAISE EXCEPTION 'El candidato no existe'; END IF;
  IF c.estado = 'contratado' THEN RAISE EXCEPTION 'Este candidato ya está contratado'; END IF;
  SELECT * INTO p FROM proceso_seleccion WHERE id_proceso = c.id_proceso_fk;

  INSERT INTO empleado (nombre, apellidos, correo, correo_personal, telefono, puesto,
                        departamento, fecha_alta, id_candidato_fk)
  VALUES (c.nombre, c.apellidos, generar_correo(c.nombre, c.apellidos), c.correo, c.telefono,
          p.puesto, p.departamento, COALESCE(p_fecha_alta, CURRENT_DATE), c.id_candidato)
  RETURNING id_empleado INTO v_empleado;

  UPDATE candidato SET estado = 'contratado', id_empleado_fk = v_empleado
  WHERE id_candidato = c.id_candidato;
  RETURN v_empleado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- FUNCIÓN: firmar una nómina (solo su dueño y solo una vez)
-- ============================================================

CREATE OR REPLACE FUNCTION firmar_nomina(p_id_nomina UUID, p_firma TEXT)
RETURNS VOID AS $$
BEGIN
  IF p_firma IS NULL OR p_firma NOT LIKE 'data:image/png;base64,%' OR LENGTH(p_firma) < 200 THEN
    RAISE EXCEPTION 'La firma está vacía';
  END IF;
  UPDATE nomina SET firmada = TRUE, firma = p_firma, fecha_firma = NOW()
  WHERE id_nomina = p_id_nomina AND id_empleado_fk = mi_empleado() AND NOT firmada;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No puedes firmar esta nómina (no es tuya o ya está firmada)';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- authenticated = cualquier trabajador que ha iniciado sesión
-- es_admin()    = trabajador con rol 'admin'
-- mi_empleado() = la ficha del trabajador que ha iniciado sesión

ALTER TABLE servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarea_inicio_plantilla ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleado ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE particular ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_particular ENABLE ROW LEVEL SECURITY;
ALTER TABLE oportunidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividad ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichaje ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarea_inicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE proceso_seleccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidato ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomina ENABLE ROW LEVEL SECURITY;

-- Catálogos: los lee todo el equipo, los cambia un administrador
CREATE POLICY "servicio_select" ON servicio FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "servicio_admin" ON servicio FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());
CREATE POLICY "plantilla_select" ON tarea_inicio_plantilla FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "plantilla_admin" ON tarea_inicio_plantilla FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

-- Empleados: todo el equipo ve el directorio; solo un administrador crea y edita fichas
CREATE POLICY "empleado_select" ON empleado FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "empleado_insert" ON empleado FOR INSERT TO authenticated WITH CHECK (es_admin());
CREATE POLICY "empleado_update" ON empleado FOR UPDATE TO authenticated USING (es_admin());
CREATE POLICY "empleado_delete" ON empleado FOR DELETE TO authenticated USING (es_admin());

-- CRM: todo el equipo trabaja con clientes y oportunidades; borrar solo un administrador
CREATE POLICY "empresa_select" ON empresa FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "empresa_insert" ON empresa FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "empresa_update" ON empresa FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "empresa_delete" ON empresa FOR DELETE TO authenticated USING (es_admin());

CREATE POLICY "particular_select" ON particular FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "particular_insert" ON particular FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "particular_update" ON particular FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "particular_delete" ON particular FOR DELETE TO authenticated USING (es_admin());

CREATE POLICY "animal_select" ON animal FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "animal_insert" ON animal FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "animal_update" ON animal FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "animal_delete" ON animal FOR DELETE TO authenticated USING (es_admin());

CREATE POLICY "animal_particular_all" ON animal_particular FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "oportunidad_select" ON oportunidad FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "oportunidad_insert" ON oportunidad FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "oportunidad_update" ON oportunidad FOR UPDATE TO authenticated USING (TRUE);
CREATE POLICY "oportunidad_delete" ON oportunidad FOR DELETE TO authenticated USING (es_admin());
-- El formulario de la web (sin sesión) solo puede crear oportunidades nuevas de origen web
CREATE POLICY "oportunidad_web" ON oportunidad FOR INSERT TO anon
  WITH CHECK (origen = 'web' AND estado = 'nuevo' AND id_responsable_fk IS NULL);

CREATE POLICY "actividad_select" ON actividad FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "actividad_insert" ON actividad FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "actividad_delete" ON actividad FOR DELETE TO authenticated
  USING (es_admin() OR id_empleado_fk = mi_empleado());

-- Fichajes: cada uno ve los suyos (y ficha con fichar()); el administrador ve y corrige todos
CREATE POLICY "fichaje_select" ON fichaje FOR SELECT TO authenticated
  USING (es_admin() OR id_empleado_fk = mi_empleado());
CREATE POLICY "fichaje_admin" ON fichaje FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

-- Vacaciones: cada uno pide las suyas; solo un administrador las concede o rechaza
CREATE POLICY "vacacion_select" ON vacacion FOR SELECT TO authenticated
  USING (es_admin() OR id_empleado_fk = mi_empleado());
CREATE POLICY "vacacion_insert" ON vacacion FOR INSERT TO authenticated
  WITH CHECK (es_admin() OR (id_empleado_fk = mi_empleado() AND estado = 'pendiente'));
CREATE POLICY "vacacion_update" ON vacacion FOR UPDATE TO authenticated USING (es_admin());
CREATE POLICY "vacacion_delete" ON vacacion FOR DELETE TO authenticated
  USING (es_admin() OR (id_empleado_fk = mi_empleado() AND estado = 'pendiente'));

-- Check de inicio: cada uno ve el suyo; lo marca un administrador
CREATE POLICY "tarea_select" ON tarea_inicio FOR SELECT TO authenticated
  USING (es_admin() OR id_empleado_fk = mi_empleado());
CREATE POLICY "tarea_admin" ON tarea_inicio FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

-- Selección: solo administradores
CREATE POLICY "proceso_admin" ON proceso_seleccion FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());
CREATE POLICY "candidato_admin" ON candidato FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

-- Evaluaciones: cada uno ve las suyas; las hace un administrador
CREATE POLICY "evaluacion_select" ON evaluacion FOR SELECT TO authenticated
  USING (es_admin() OR id_empleado_fk = mi_empleado());
CREATE POLICY "evaluacion_admin" ON evaluacion FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

-- Nóminas: cada uno ve las suyas (y las firma con firmar_nomina()); las sube un administrador
CREATE POLICY "nomina_select" ON nomina FOR SELECT TO authenticated
  USING (es_admin() OR id_empleado_fk = mi_empleado());
CREATE POLICY "nomina_admin" ON nomina FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

-- ============================================================
-- STORAGE (archivos)
-- ============================================================
-- fotos   → público: fotos de empleados, logos de empresas y fotos de animales
-- cvs     → privado: CV de los candidatos (solo administradores)
-- nominas → privado: PDF de nóminas en la carpeta <id_empleado>/ (su dueño y administradores)

INSERT INTO storage.buckets (id, name, public) VALUES
  ('fotos', 'fotos', TRUE), ('cvs', 'cvs', FALSE), ('nominas', 'nominas', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "fotos_leer" ON storage.objects;
DROP POLICY IF EXISTS "fotos_subir" ON storage.objects;
DROP POLICY IF EXISTS "fotos_cambiar" ON storage.objects;
DROP POLICY IF EXISTS "fotos_borrar" ON storage.objects;
DROP POLICY IF EXISTS "cvs_admin" ON storage.objects;
DROP POLICY IF EXISTS "nominas_leer" ON storage.objects;
DROP POLICY IF EXISTS "nominas_admin" ON storage.objects;

CREATE POLICY "fotos_leer" ON storage.objects FOR SELECT USING (bucket_id = 'fotos');
CREATE POLICY "fotos_subir" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fotos');
CREATE POLICY "fotos_cambiar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'fotos');
CREATE POLICY "fotos_borrar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'fotos');

CREATE POLICY "cvs_admin" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'cvs' AND es_admin()) WITH CHECK (bucket_id = 'cvs' AND es_admin());

CREATE POLICY "nominas_leer" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'nominas' AND (es_admin() OR (storage.foldername(name))[1] = mi_empleado()::TEXT));
CREATE POLICY "nominas_admin" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'nominas' AND es_admin()) WITH CHECK (bucket_id = 'nominas' AND es_admin());

-- ============================================================
-- PRIMER ADMINISTRADOR
-- ============================================================
-- datos_ejemplo.sql ya crea a Laura (prueba@gmail.com) como administradora.
-- Si NO vas a cargar los datos de ejemplo, quita los "--" de estas líneas,
-- pon tu correo (el mismo del usuario de Supabase Authentication) y ejecútalas:
--
-- INSERT INTO empleado (nombre, apellidos, correo, puesto, departamento, rol)
-- VALUES ('Tu nombre', 'Tus apellidos', 'tu@correo.com', 'Dirección', 'Dirección', 'admin');
