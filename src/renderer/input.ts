import type * as THREE from 'three'

/** Alfa mínima (0–255) para considerar que un píxel es parte del personaje y no fondo transparente. */
const ALPHA_THRESHOLD = 25

/**
 * Click-through: la ventana ignora los clics salvo cuando el cursor está sobre el personaje.
 * Como el main usa forward: true, seguimos recibiendo mousemove aunque los clics atraviesen.
 *
 * En vez de un raycast (medido: ~125 ms por consulta con 120k triángulos deformados por huesos)
 * leemos el alfa del píxel bajo el cursor justo después de dibujar. Es exacto con cualquier
 * animación (lo que se ve es lo que se toca) y cuesta una fracción de milisegundo.
 *
 * Devuelve una función que hay que llamar en cada frame, justo después de renderer.render().
 */
export function setupClickThrough(renderer: THREE.WebGLRenderer): () => void {
  let ignoring = true
  let mouse: { x: number; y: number } | null = null
  const pixel = new Uint8Array(4)

  const setIgnore = (ignore: boolean) => {
    if (ignore === ignoring) return // solo avisamos al main cuando cambia, no en cada frame
    ignoring = ignore
    window.pet.setIgnoreMouse(ignore)
    document.body.style.cursor = ignore ? '' : 'grab'
  }

  window.addEventListener('mousemove', (e) => (mouse = { x: e.clientX, y: e.clientY }))
  window.addEventListener('mouseleave', () => {
    mouse = null
    setIgnore(true)
  })

  return () => {
    if (!mouse) return
    // Se revisa en cada frame (no solo al mover el mouse) porque el personaje se mueve bajo el cursor
    const gl = renderer.getContext()
    const dpr = renderer.getPixelRatio()
    const px = Math.min(gl.drawingBufferWidth - 1, Math.floor(mouse.x * dpr))
    // WebGL cuenta Y desde abajo; el mouse, desde arriba
    const py = Math.max(0, gl.drawingBufferHeight - 1 - Math.floor(mouse.y * dpr))
    gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel)
    setIgnore(pixel[3] < ALPHA_THRESHOLD)
  }
}
