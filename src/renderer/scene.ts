import * as THREE from 'three'
import { CAMERA_HALF_SIZE, WINDOW_SIZE } from '../shared/config'

/** Crea renderer, escena, cámara y luces. El canvas se agrega al <body>. */
export function createScene() {
  // alpha: true + clear color con alfa 0 = el fondo del canvas queda transparente
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(WINDOW_SIZE, WINDOW_SIZE)
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()

  // Cámara ortográfica: sin perspectiva, el personaje se ve igual de grande en toda la ventana
  const h = CAMERA_HALF_SIZE
  const camera = new THREE.OrthographicCamera(-h, h, h, -h, 0.1, 100)
  camera.position.set(0, 0, 10)

  // Luz suave tipo kawaii: el cielo (blanco cálido) y el suelo (rosa claro) rellenan las sombras
  scene.add(new THREE.HemisphereLight(0xfff8f0, 0xffd6e0, 2.2))
  const sun = new THREE.DirectionalLight(0xffffff, 1.2)
  sun.position.set(1, 2, 3)
  scene.add(sun)

  return { renderer, scene, camera }
}
