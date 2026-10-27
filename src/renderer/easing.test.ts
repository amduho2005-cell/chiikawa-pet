// Autocomprobación de easing.ts. Se corre con: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { easeInOutSine, squashXZ } from './easing.ts'

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`)

test('easeInOutSine va de 0 a 1 y pasa por 0.5 a la mitad', () => {
  close(easeInOutSine(0), 0)
  close(easeInOutSine(0.5), 0.5)
  close(easeInOutSine(1), 1)
})

test('squashXZ conserva el volumen', () => {
  for (const y of [0.7, 1, 1.3]) close(y * squashXZ(y) ** 2, 1)
})
