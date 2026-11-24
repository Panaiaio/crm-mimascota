// Base CSS for the site blocks. Every selector lives under `.sitio` so the same
// stylesheet can be used in the CRM editor preview without leaking into the CRM.
// Colours come from the palette variables (--fondo, --texto, ...) and --fuente.
export const SITIO_CSS = `.sitio {
  box-sizing: border-box;
  min-height: 100vh;
  background: var(--fondo);
  color: var(--texto);
  font-family: var(--fuente);
  font-size: 1rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.sitio *, .sitio *::before, .sitio *::after { box-sizing: inherit; }
.sitio img { display: block; max-width: 100%; height: auto; }
.sitio h1, .sitio h2, .sitio h3, .sitio p, .sitio ul, .sitio dl, .sitio dd, .sitio figure, .sitio blockquote { margin: 0; }
.sitio ul { padding: 0; list-style: none; }
.sitio h2 { font-size: 1.75rem; line-height: 1.25; margin-bottom: 1rem; }
.sitio h3 { font-size: 1.125rem; line-height: 1.3; }
.sitio p + p { margin-top: 1rem; }
.sitio p a, .sitio dd a { color: var(--primario); text-decoration: underline; text-underline-offset: 0.2em; }
.sitio a:focus-visible, .sitio summary:focus-visible { outline: 3px solid var(--primario); outline-offset: 3px; }

.sitio .sitio-barra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1.5rem;
  padding: 1rem 1.5rem;
  background: var(--superficie);
}
.sitio .sitio-marca { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
.sitio .sitio-marca img { width: 2.5rem; height: 2.5rem; object-fit: contain; }
.sitio .sitio-marca h1 { font-size: 1.25rem; line-height: 1.3; }
.sitio .sitio-barra ul { display: flex; flex-wrap: wrap; gap: 0 1rem; }
.sitio .sitio-barra nav a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--texto);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}
.sitio .sitio-pie { padding: 1.5rem; background: var(--superficie); color: var(--texto_suave); text-align: center; }

.sitio main > section { max-width: 64rem; margin: 0 auto; padding: 3rem 1.5rem; }
.sitio .b-cabecera { display: grid; gap: 2rem; align-items: center; }
.sitio .b-cabecera h2 { font-size: 2.25rem; }
.sitio .b-cabecera-texto p { color: var(--texto_suave); font-size: 1.125rem; }
.sitio .b-cabecera-texto .b-boton { margin-top: 1.5rem; }
.sitio .b-cabecera-imagen { width: 100%; border-radius: 0.5rem; }

.sitio .b-boton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  background: var(--primario);
  color: var(--sobre_primario);
  font-weight: 600;
  text-decoration: none;
  transition: opacity 0.15s ease;
}
.sitio .b-boton:hover { opacity: 0.85; }

.sitio .b-texto p { max-width: 42rem; white-space: pre-line; }

.sitio .b-tarjetas ul, .sitio .b-equipo ul, .sitio .b-galeria ul, .sitio .b-testimonios ul {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
}
.sitio .b-tarjetas li, .sitio .b-testimonios li { padding: 1.5rem; border-radius: 0.5rem; background: var(--superficie); }
.sitio .b-tarjetas h3 { margin-bottom: 0.5rem; }
.sitio .b-tarjetas p, .sitio .b-equipo p { color: var(--texto_suave); }

.sitio .b-galeria img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 0.5rem; }
.sitio .b-galeria figcaption { margin-top: 0.5rem; color: var(--texto_suave); font-size: 0.875rem; }

.sitio .b-equipo li { text-align: center; }
.sitio .b-equipo img { width: 8rem; height: 8rem; margin: 0 auto 1rem; border-radius: 50%; object-fit: cover; }

.sitio .b-testimonios blockquote { font-size: 1.0625rem; }
.sitio .b-testimonios figcaption { margin-top: 1rem; color: var(--texto_suave); font-weight: 600; }

.sitio .b-preguntas details { border-bottom: 1px solid var(--texto_suave); }
.sitio .b-preguntas summary { display: flex; align-items: center; min-height: 44px; padding: 0.5rem 0; font-weight: 600; cursor: pointer; }
.sitio .b-preguntas details p { padding-bottom: 1rem; }

.sitio main > .b-llamada { max-width: none; background: var(--superficie); text-align: center; }
.sitio .b-llamada p { max-width: 36rem; margin: 0 auto 1.5rem; color: var(--texto_suave); }

.sitio .b-contacto dl { display: grid; gap: 0.25rem 1.5rem; grid-template-columns: minmax(0, 1fr); margin-bottom: 1.5rem; }
.sitio .b-contacto dt { margin-top: 0.75rem; font-weight: 600; }
.sitio .b-contacto dd { white-space: pre-line; }

@media (min-width: 48rem) {
  .sitio .b-cabecera:has(.b-cabecera-imagen) { grid-template-columns: 1fr 1fr; }
  .sitio .b-contacto dl { grid-template-columns: max-content minmax(0, 1fr); }
  .sitio .b-contacto dt { margin-top: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .sitio *, .sitio *::before, .sitio *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; }
}
`
