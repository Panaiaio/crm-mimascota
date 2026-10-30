// Solo en el navegador (genera PDF con @react-pdf). Se usa desde componentes 'use client'.
import { createClient } from '@/lib/supabase/client'
import { BUCKET_PEDIDOS, guardarPdfPedido } from '@/lib/ventas-pdf'

/**
 * Botón «Revisar facturas» (pantalla Pedidos): habla con el agente lector de facturas (carpeta agente/).
 *
 * El agente corre en un ordenador aparte, así que no se le llama directamente: se deja una petición
 * en la tabla peticion_agente y Supabase Realtime le avisa al momento. El agente comprueba qué facturas
 * están ya en la base de datos (con esas no hace nada), guarda las que falten y apunta el resultado
 * en la misma petición, que este código va leyendo hasta que termina.
 */
export interface ResultadoAgente {
  estado: 'hecha' | 'error' | 'sin_agente'
  guardadas: number
  ya_estaban: number
  errores: number
  mensaje: string | null
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Si en este tiempo nadie toma la petición, el agente está apagado (al arrancar la cierra sin hacerla) */
const SIN_AGENTE_MS = 15_000
/** Tiempo máximo leyendo facturas (cada una es una llamada a la IA) */
const MAXIMO_MS = 5 * 60_000

export async function revisarFacturas(idsPedidos: string[], alPaso: (texto: string) => void): Promise<ResultadoAgente> {
  const sb = createClient()

  // 1. El PDF solo lo sabe hacer el CRM: se sube el de los pedidos que aún no lo tengan en Supabase
  alPaso('Comprobando los PDF…')
  const { data: objetos, error: errLista } = await sb.storage.from(BUCKET_PEDIDOS).list('', { limit: 1000 })
  if (errLista) throw errLista
  const subidos = new Set((objetos ?? []).map((o) => o.name))
  const faltan = idsPedidos.filter((id) => !subidos.has(`${id}.pdf`))
  for (const [i, id] of faltan.entries()) {
    alPaso(`Preparando PDF ${i + 1} de ${faltan.length}…`)
    await guardarPdfPedido(id)
  }

  // 2. La petición al agente
  alPaso('Avisando al agente…')
  const { data: peticion, error: errPeticion } = await sb.from('peticion_agente').insert({}).select('id_peticion').single()
  if (errPeticion) throw errPeticion

  // 3. Esperar a que el agente la termine
  const inicio = Date.now()
  while (Date.now() - inicio < MAXIMO_MS) {
    await espera(1500)
    const { data: p, error } = await sb.from('peticion_agente')
      .select('estado, guardadas, ya_estaban, errores, mensaje').eq('id_peticion', peticion.id_peticion).single()
    if (error) throw error
    if (p.estado === 'hecha' || p.estado === 'error') return p as ResultadoAgente
    if (p.estado === 'pendiente' && Date.now() - inicio > SIN_AGENTE_MS) {
      return { estado: 'sin_agente', guardadas: 0, ya_estaban: 0, errores: 0, mensaje: null }
    }
    alPaso(p.estado === 'en_curso' ? 'El agente está leyendo las facturas…' : 'Esperando al agente…')
  }
  throw new Error('El agente está tardando demasiado. Mira su ventana para ver qué está haciendo.')
}

/** Texto del aviso con el resultado ("2 facturas guardadas, 5 ya estaban en la base de datos") */
export function textoResultado(r: ResultadoAgente) {
  const guardadas = `${r.guardadas} ${r.guardadas === 1 ? 'factura guardada' : 'facturas guardadas'}`
  const ya = `${r.ya_estaban} ya ${r.ya_estaban === 1 ? 'estaba' : 'estaban'} en la base de datos`
  return `Facturas revisadas: ${guardadas}, ${ya}`
}
