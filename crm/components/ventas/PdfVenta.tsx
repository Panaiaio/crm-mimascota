import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { nombreCliente } from '@/lib/crm-utils'
import {
  codigoVenta, condicionPagoTexto, DATOS_CLINICA, estadoVentaInfo, formatCantidad, totalesVenta,
} from '@/lib/ventas-utils'
import { formatDia, formatEUR, nombreCompleto } from '@/lib/utils'
import type { LineaVenta, Venta } from '@/types'

/** Customer fields that SELECT_VENTA does not bring (fetched apart for the document) */
export interface DatosClientePdf {
  cif?: string | null
  direccion?: string | null
  ciudad?: string | null
  telefono?: string | null
  correo?: string | null
}

const NEGRO = '#000'
const GRIS = '#555'

const s = StyleSheet.create({
  pagina: { paddingTop: 40, paddingBottom: 64, paddingHorizontal: 40, fontFamily: 'Helvetica', fontSize: 9, color: NEGRO, lineHeight: 1.4 },
  cabecera: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#999' },
  clinica: { flexDirection: 'row', gap: 12 },
  logo: { width: 48, height: 48 },
  nombreClinica: { fontFamily: 'Helvetica-Bold', fontSize: 11, marginBottom: 4 },
  secundario: { color: GRIS },
  documento: { alignItems: 'flex-end' },
  titulo: { fontFamily: 'Helvetica-Bold', fontSize: 20, lineHeight: 1.2, marginBottom: 8 },
  codigo: { fontFamily: 'Helvetica-Bold', fontSize: 12, marginBottom: 4 },
  bloques: { flexDirection: 'row', gap: 24, marginTop: 24 },
  bloque: { flex: 1 },
  etiqueta: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: GRIS, marginBottom: 4 },
  destacado: { fontFamily: 'Helvetica-Bold', fontSize: 10 },
  tabla: { marginTop: 24 },
  filaCabecera: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#999', fontFamily: 'Helvetica-Bold', fontSize: 8, color: GRIS },
  fila: { flexDirection: 'row', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#ccc' },
  colDescripcion: { flex: 1, paddingRight: 8 },
  colCantidad: { width: 48, textAlign: 'right' },
  colPrecio: { width: 64, textAlign: 'right' },
  colDto: { width: 40, textAlign: 'right' },
  colIva: { width: 32, textAlign: 'right' },
  colSubtotal: { width: 72, textAlign: 'right' },
  totales: { alignSelf: 'flex-end', width: 240, marginTop: 16 },
  filaTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  total: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: NEGRO, fontFamily: 'Helvetica-Bold', fontSize: 12 },
  apartado: { marginTop: 24 },
  pie: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 0.5, borderTopColor: '#ccc', fontSize: 8, color: GRIS },
})

/** Printable quote or sales order (A4, black and white) */
export default function PdfVenta({ venta, lineas, cliente, logoSrc }: {
  venta: Venta
  lineas: LineaVenta[]
  cliente: DatosClientePdf
  logoSrc: string
}) {
  const codigo = codigoVenta(venta.numero)
  const tipo = venta.estado === 'pedido' ? 'Pedido de venta' : 'Presupuesto'
  const { desglose } = totalesVenta(lineas)
  const datosCliente = (venta.empresa
    ? [cliente.cif && `CIF ${cliente.cif}`, cliente.direccion, cliente.ciudad, cliente.telefono, cliente.correo]
    : [cliente.telefono, cliente.correo, cliente.ciudad]
  ).filter(Boolean) as string[]
  const animal = venta.animal

  return (
    <Document title={`${venta.estado === 'pedido' ? 'Pedido' : 'Presupuesto'} ${codigo}`} author={DATOS_CLINICA.nombreLegal} language="es-ES">
      <Page size="A4" style={s.pagina}>
        <View style={s.cabecera}>
          <View style={s.clinica}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt attribute */}
            <Image src={logoSrc} style={s.logo} />
            <View>
              <Text style={s.nombreClinica}>{DATOS_CLINICA.nombreLegal}</Text>
              <Text style={s.secundario}>CIF {DATOS_CLINICA.cif}</Text>
              <Text style={s.secundario}>{DATOS_CLINICA.direccion}, {DATOS_CLINICA.codigoPostal} {DATOS_CLINICA.ciudad}</Text>
              <Text style={s.secundario}>{DATOS_CLINICA.telefono}</Text>
              <Text style={s.secundario}>{DATOS_CLINICA.correo}</Text>
              <Text style={s.secundario}>{DATOS_CLINICA.web}</Text>
            </View>
          </View>
          <View style={s.documento}>
            <Text style={s.titulo}>{tipo}</Text>
            <Text style={s.codigo}>{codigo}</Text>
            {/* An order's state is already its title */}
            {venta.estado !== 'pedido' && <Text style={s.secundario}>{estadoVentaInfo(venta.estado).texto}</Text>}
            <Text>Fecha: {formatDia(venta.fecha)}</Text>
            <Text>Válido hasta: {formatDia(venta.fecha_validez)}</Text>
          </View>
        </View>

        <View style={s.bloques}>
          <View style={s.bloque}>
            <Text style={s.etiqueta}>Cliente</Text>
            <Text style={s.destacado}>{nombreCliente(venta)}</Text>
            {datosCliente.map((d) => <Text key={d} style={s.secundario}>{d}</Text>)}
          </View>
          <View style={s.bloque}>
            <Text style={s.etiqueta}>Animal</Text>
            {animal
              ? <Text>{[animal.nombre, animal.especie, animal.raza].filter(Boolean).join(' · ')}</Text>
              : <Text>—</Text>}
            <Text style={[s.etiqueta, { marginTop: 8 }]}>Comercial</Text>
            <Text>{venta.responsable ? nombreCompleto(venta.responsable) : 'Sin asignar'}</Text>
          </View>
        </View>

        <View style={s.tabla}>
          <View style={s.filaCabecera} fixed>
            <Text style={s.colDescripcion}>Descripción</Text>
            <Text style={s.colCantidad}>Cantidad</Text>
            <Text style={s.colPrecio}>Precio</Text>
            <Text style={s.colDto}>Dto.</Text>
            <Text style={s.colIva}>IVA</Text>
            <Text style={s.colSubtotal}>Subtotal</Text>
          </View>
          {lineas.map((l) => (
            <View key={l.id_linea_venta} style={s.fila} wrap={false}>
              <Text style={s.colDescripcion}>{l.descripcion}</Text>
              <Text style={s.colCantidad}>{formatCantidad(l.cantidad)}</Text>
              <Text style={s.colPrecio}>{formatEUR(l.precio_unitario, 2)}</Text>
              <Text style={s.colDto}>{Number(l.descuento) ? `${formatCantidad(l.descuento)} %` : '—'}</Text>
              <Text style={s.colIva}>{`${l.iva} %`}</Text>
              <Text style={s.colSubtotal}>{formatEUR(l.subtotal, 2)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totales} wrap={false}>
          <View style={s.filaTotal}>
            <Text>Base imponible</Text>
            <Text>{formatEUR(venta.base_imponible, 2)}</Text>
          </View>
          {desglose.map((d) => (
            <View key={d.tipo} style={s.filaTotal}>
              <Text style={s.secundario}>{`IVA ${d.tipo} % sobre ${formatEUR(d.base, 2)}`}</Text>
              <Text>{formatEUR(d.iva, 2)}</Text>
            </View>
          ))}
          <View style={s.total}>
            <Text>Total</Text>
            <Text>{formatEUR(venta.total, 2)}</Text>
          </View>
        </View>

        <View style={s.apartado} wrap={false}>
          <Text style={s.etiqueta}>Condiciones de pago</Text>
          <Text>{condicionPagoTexto(venta.condiciones_pago)}</Text>
        </View>

        {venta.notas && (
          <View style={s.apartado}>
            <Text style={s.etiqueta}>Notas</Text>
            <Text>{venta.notas}</Text>
          </View>
        )}

        <View style={s.pie} fixed>
          <Text>{`${DATOS_CLINICA.nombreLegal} · CIF ${DATOS_CLINICA.cif} · ${DATOS_CLINICA.web}`}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
