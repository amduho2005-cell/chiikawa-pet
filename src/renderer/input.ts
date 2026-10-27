import type * as THREE from 'three'
import { BEHAVIOR } from '../shared/config'

/** Alfa mínima (0–255) para considerar que un píxel es parte del personaje y no fondo transparente. */
const ALPHA_THRESHOLD = 25

export interface PointerHandlers {
  onClick(): void
  onDoubleClick(): void
  onDragStart(): void
  /** Posición deseada de la ventana (esquina superior izquierda, en coordenadas de pantalla). */
  onDragMove(x: number, y: number): void
  onDragEnd(): void
}

/**
 * Entrada del mouse:
 * - Click-through: la ventana ignora los clics salvo cuando el cursor está sobre el personaje.
 *   Como el main usa forward: true, seguimos recibiendo mousemove aunque los clics atraviesen.
 *   En vez de un raycast (medido: ~125 ms por consulta con 120k triángulos deformados por huesos)
 *   leemos el alfa del píxel bajo el cursor justo después de dibujar: es exacto con cualquier
 *   animación y cuesta una fracción de milisegundo.
 * - Clic vs arrastre: si el cursor se mueve más de BEHAVIOR.dragThreshold px con el botón
 *   apretado es un arrastre; si no, al soltar es un clic.
 * - Clic vs doble clic: el clic espera BEHAVIOR.doubleClickTime por si llega un segundo clic;
 *   así un doble clic no dispara también el gesto del clic simple.
 *
 * Devuelve una función que hay que llamar en cada frame, justo después de renderer.render().
 */
export function setupInput(renderer: THREE.WebGLRenderer, handlers: PointerHandlers): () => void {
  const canvas = renderer.domElement
  let ignoring = true
  let mouse: { x: number; y: number } | null = null
  const pixel = new Uint8Array(4)
  // Dónde se apretó el botón (pantalla) y en qué punto de la ventana se agarró al personaje
  let press: { screenX: number; screenY: number; grabX: number; grabY: number } | null = null
  let dragging = false
  let clickTimer: number | undefined

  const setIgnore = (ignore: boolean) => {
    if (ignore === ignoring) return // solo avisamos al main cuando cambia, no en cada frame
    ignoring = ignore
    window.pet.setIgnoreMouse(ignore)
    document.body.style.cursor = ignore ? '' : 'grab'
  }

  window.addEventListener('mousemove', (e) => (mouse = { x: e.clientX, y: e.clientY }))
  window.addEventListener('mouseleave', () => {
    mouse = null
    if (!press) setIgnore(true)
  })

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    // Pointer capture: aunque el cursor salga de la ventana (arrastre rápido), los eventos siguen llegando aquí
    canvas.setPointerCapture(e.pointerId)
    press = { screenX: e.screenX, screenY: e.screenY, grabX: e.clientX, grabY: e.clientY }
    dragging = false
  })

  canvas.addEventListener('pointermove', (e) => {
    if (!press) return
    if (!dragging) {
      if (Math.hypot(e.screenX - press.screenX, e.screenY - press.screenY) < BEHAVIOR.dragThreshold) return
      dragging = true
      document.body.style.cursor = 'grabbing'
      handlers.onDragStart()
    }
    // La ventana se coloca para que el punto agarrado quede bajo el cursor
    handlers.onDragMove(e.screenX - press.grabX, e.screenY - press.grabY)
  })

  const click = () => {
    if (clickTimer !== undefined) {
      window.clearTimeout(clickTimer)
      clickTimer = undefined
      handlers.onDoubleClick()
    } else {
      clickTimer = window.setTimeout(() => {
        clickTimer = undefined
        handlers.onClick()
      }, BEHAVIOR.doubleClickTime * 1000)
    }
  }

  const release = (isClick: boolean) => {
    if (!press) return
    press = null
    if (dragging) {
      dragging = false
      document.body.style.cursor = ignoring ? '' : 'grab'
      handlers.onDragEnd()
    } else if (isClick) click()
  }
  canvas.addEventListener('pointerup', () => release(true))
  canvas.addEventListener('pointercancel', () => release(false))

  return () => {
    // Mientras el botón está apretado no cambiamos el click-through: si no, al arrastrar
    // rápido el cursor quedaría sobre un píxel transparente y perderíamos el arrastre
    if (!mouse || press) return
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
