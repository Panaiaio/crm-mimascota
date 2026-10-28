-- ============================================================
-- FACTURAS (las guarda el agente lector de facturas, carpeta agente/)
-- Ejecutar en Supabase SQL Editor después de schema.sql.
-- Se puede volver a ejecutar sin perder datos: no borra nada.
-- ============================================================

CREATE TABLE IF NOT EXISTS facturas (
  id_factura UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(60),                   -- número de la factura tal como aparece
  fecha DATE,
  proveedor VARCHAR(200),
  nif VARCHAR(20),
  base DECIMAL(12,2),                   -- base imponible
  iva DECIMAL(12,2),                    -- cuota de IVA (importe, no porcentaje)
  total DECIMAL(12,2),
  archivo TEXT NOT NULL,                -- nombre del fichero que leyó el agente
  fecha_alta TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- La misma factura de un proveedor no se guarda dos veces
CREATE UNIQUE INDEX IF NOT EXISTS facturas_numero_proveedor
  ON facturas (numero, nif) WHERE numero IS NOT NULL AND nif IS NOT NULL;

-- ============================================================
-- SEGURIDAD
-- El agente escribe con la clave service_role (se salta RLS).
-- En el CRM solo un administrador puede ver y corregir facturas.
-- ============================================================

ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facturas_admin" ON facturas;
CREATE POLICY "facturas_admin" ON facturas FOR ALL TO authenticated USING (es_admin()) WITH CHECK (es_admin());
