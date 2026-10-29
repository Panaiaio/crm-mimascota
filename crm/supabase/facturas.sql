-- ============================================================
-- FACTURAS (las guarda el agente lector de facturas, carpeta agente/)
-- Ejecutar en Supabase SQL Editor después de schema.sql y ventas.sql.
-- Se puede volver a ejecutar sin perder datos: no borra nada.
--
-- Dos tipos:
--   recibida → factura de un proveedor que llega a agente/facturas/entrada
--   emitida  → pedido de venta confirmado en el CRM: su PDF se sube al bucket
--              'pedidos' y el agente lo lee y lo guarda aquí, enlazado a la venta
-- ============================================================

CREATE TABLE IF NOT EXISTS facturas (
  id_factura UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(60),                   -- número de la factura tal como aparece
  fecha DATE,
  proveedor VARCHAR(200),               -- quien emite la factura
  nif VARCHAR(20),                      -- NIF de quien la emite
  base DECIMAL(12,2),                   -- base imponible
  iva DECIMAL(12,2),                    -- cuota de IVA (importe, no porcentaje)
  total DECIMAL(12,2),
  archivo TEXT NOT NULL,                -- nombre del fichero que leyó el agente
  fecha_alta TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE facturas ADD COLUMN IF NOT EXISTS tipo VARCHAR(10) NOT NULL DEFAULT 'recibida';
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS cliente VARCHAR(200);      -- a quien va dirigida
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS nif_cliente VARCHAR(20);
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS id_venta_fk UUID REFERENCES venta(id_venta) ON DELETE SET NULL;

ALTER TABLE facturas DROP CONSTRAINT IF EXISTS facturas_tipo_check;
ALTER TABLE facturas ADD CONSTRAINT facturas_tipo_check CHECK (tipo IN ('recibida', 'emitida'));

-- Un pedido tiene como mucho una factura emitida (si se vuelve a confirmar, se actualiza)
ALTER TABLE facturas DROP CONSTRAINT IF EXISTS facturas_id_venta_unica;
ALTER TABLE facturas ADD CONSTRAINT facturas_id_venta_unica UNIQUE (id_venta_fk);

-- La misma factura de un proveedor no se guarda dos veces
CREATE UNIQUE INDEX IF NOT EXISTS facturas_numero_proveedor
  ON facturas (numero, nif) WHERE numero IS NOT NULL AND nif IS NOT NULL;

CREATE INDEX IF NOT EXISTS facturas_tipo_idx ON facturas (tipo);

-- ============================================================
-- SEGURIDAD
-- El agente escribe con la clave service_role (se salta RLS).
-- En el CRM solo un administrador puede ver y corregir facturas.
-- ============================================================

ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facturas_admin" ON facturas;
CREATE POLICY "facturas_admin" ON facturas FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());

-- ============================================================
-- STORAGE: bucket privado 'pedidos'
-- El CRM sube aquí el PDF de cada pedido al confirmarlo (<id_venta>.pdf).
-- El equipo puede subirlo y leerlo; borrar, solo un administrador.
-- El agente lo descarga con la clave service_role.
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('pedidos', 'pedidos', FALSE)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "pedidos_leer" ON storage.objects;
DROP POLICY IF EXISTS "pedidos_subir" ON storage.objects;
DROP POLICY IF EXISTS "pedidos_cambiar" ON storage.objects;
DROP POLICY IF EXISTS "pedidos_borrar" ON storage.objects;

CREATE POLICY "pedidos_leer" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'pedidos');
CREATE POLICY "pedidos_subir" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pedidos');
CREATE POLICY "pedidos_cambiar" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'pedidos');
CREATE POLICY "pedidos_borrar" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pedidos' AND es_admin());
