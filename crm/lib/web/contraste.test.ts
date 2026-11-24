import { test, expect } from 'vitest'
import { contraste, CONTRASTE_TEXTO, CONTRASTE_GRAFICO } from './contraste'

test('contraste', () => {
  expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 1)
  expect(contraste('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
  expect(contraste('#ffffff', '#000000')).toBeCloseTo(21, 1)
})

test('thresholds', () => {
  expect(CONTRASTE_TEXTO).toBe(4.5)
  expect(CONTRASTE_GRAFICO).toBe(3)
})
