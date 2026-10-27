import { createScene } from './scene'
import { loadModel } from './model'
import { inspectRig, addSkeletonHelper, buildRig } from './rig'
import { setupClickThrough } from './input'
import { Animator } from './procedural'
import { PetBrain } from './stateMachine'
import { DEBUG } from '../shared/config'

const { renderer, scene, camera } = createScene()
const checkHover = setupClickThrough(renderer)
let animator: Animator | null = null
let brain: PetBrain | null = null

loadModel()
  .then(({ pet, animations }) => {
    scene.add(pet)
    inspectRig(pet, animations)
    if (DEBUG) addSkeletonHelper(scene, pet)
    animator = new Animator(pet, buildRig(pet)) // empieza en idle
    brain = new PetBrain(animator)
  })
  .catch((err) => console.error('No se pudo cargar el modelo:', err))

let last = performance.now()
renderer.setAnimationLoop((now: number) => {
  // Tope de 0.1 s: si la ventana estuvo pausada no queremos un salto gigante
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  brain?.update(dt) // primero decide (y mueve la ventana)...
  animator?.update(dt) // ...luego pose del frame
  renderer.render(scene, camera)
  checkHover() // debe ir justo después de render: el píxel solo es legible en este mismo frame
})
