import { expect, test } from 'vitest'
import { SITIO_CSS, SITIO_CSS_VISTA } from './sitio.css'

test('the preview CSS turns every width breakpoint into a container query', () => {
  expect(SITIO_CSS).toContain('@media (min-width:')
  expect(SITIO_CSS_VISTA).not.toContain('@media (min-width:')
  expect(SITIO_CSS_VISTA).toContain('@container vista (min-width:')
  expect(SITIO_CSS_VISTA).toContain('.vista-web .sitio { min-height: 0; }')
})

test('block rules still reach the blocks inside the editor wrapper', () => {
  expect(SITIO_CSS).toContain('.sitio main > section')
  expect(SITIO_CSS_VISTA).not.toMatch(/\.sitio main > (?!\.sitio-marco)/)
  expect(SITIO_CSS_VISTA).toContain('.sitio main > .sitio-marco > section')
})
