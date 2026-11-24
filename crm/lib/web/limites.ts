// Collaborator limits, mirroring the `comprobar_colaborador` trigger in
// supabase/webs.sql. The owner always counts as an editor and as a person;
// admins are never collaborator rows, so they never count here.
export const MAX_EDITORES = 3
export const MAX_PERSONAS = 6

export function limites(colaboradores: { rol: 'editor' | 'lector' }[]) {
  const editores = 1 + colaboradores.filter((c) => c.rol === 'editor').length
  const personas = 1 + colaboradores.length
  return {
    editores,
    personas,
    puedeEditor: editores < MAX_EDITORES,
    puedeAnadir: personas < MAX_PERSONAS,
  }
}
