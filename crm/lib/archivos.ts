import { createClient } from '@/lib/supabase/client'

// ============================================================
// Subir y abrir archivos de Supabase Storage
//  fotos   → público (fotos de empleados, logos, animales)
//  cvs     → privado (CV de candidatos)
//  nominas → privado (PDF de nóminas, carpeta <id_empleado>/)
// ============================================================

/** Sube una imagen al bucket público "fotos" y devuelve su URL */
export async function subirFoto(archivo: File, carpeta: 'empleados' | 'empresas' | 'animales') {
  const sb = createClient()
  const ext = archivo.name.split('.').pop()?.toLowerCase() || 'jpg'
  const ruta = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await sb.storage.from('fotos').upload(ruta, archivo, { upsert: false, contentType: archivo.type })
  if (error) throw error
  return sb.storage.from('fotos').getPublicUrl(ruta).data.publicUrl
}

/** Sube un PDF a un bucket privado en la ruta indicada */
export async function subirPDF(bucket: 'cvs' | 'nominas', ruta: string, archivo: File) {
  const { error } = await createClient().storage.from(bucket).upload(ruta, archivo, { upsert: true, contentType: 'application/pdf' })
  if (error) throw error
  return ruta
}

/** Abre un archivo privado en otra pestaña (con un enlace que caduca en 5 minutos) */
export async function abrirPrivado(bucket: 'cvs' | 'nominas', ruta: string) {
  const ventana = window.open('', '_blank')
  const { data, error } = await createClient().storage.from(bucket).createSignedUrl(ruta, 300)
  if (error || !data) {
    ventana?.close()
    throw error ?? new Error('No se ha podido abrir el archivo')
  }
  if (ventana) ventana.location.href = data.signedUrl
  else window.location.href = data.signedUrl
}

export async function borrarArchivo(bucket: 'cvs' | 'nominas' | 'fotos', ruta: string) {
  await createClient().storage.from(bucket).remove([ruta])
}
