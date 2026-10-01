'use client'

import { useEffect, useState } from 'react'

export type Tema = 'light' | 'dark'

/** Modo claro / oscuro. Se guarda en el navegador y se aplica en <html data-theme="..."> */
export function useTema() {
  const [tema, setTema] = useState<Tema>('light')

  useEffect(() => {
    setTema(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  }, [])

  function cambiar(nuevo?: Tema) {
    const t = nuevo ?? (tema === 'dark' ? 'light' : 'dark')
    document.documentElement.dataset.theme = t
    try { localStorage.setItem('tema', t) } catch {}
    setTema(t)
  }

  return { tema, cambiar }
}

/** Script que se ejecuta antes de pintar la página para que no parpadee el tema */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem('tema');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='light'}})()`
