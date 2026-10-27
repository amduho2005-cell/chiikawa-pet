import { createScene } from './scene'
import { loadModel } from './model'
import { inspectRig, addSkeletonHelper, buildRig } from './rig'
import { setupInput } from './input'
import { Animator } from './procedural'
import { ClipPlayer } from './clips'
import { PetBrain } from './stateMachine'
import { Effects } from './effects'
import { DEBUG } from '../shared/config'

const { renderer, scene, camera } = createScene()
// Los eventos del mouse solo llegan cuando el cursor está sobre el personaje (el resto atraviesa la ventana)
const checkHover = setupInput(renderer, {
  onClick: () => brain?.onClick(),
  onDoubleClick: () => brain?.onDoubleClick(),
  onDragStart: () => brain?.onDragStart(),
  onDragMove: (x, y) => brain?.onDragMove(x, y),
  onDragEnd: () => brain?.onDragEnd()
})
let animator: Animator | null = null
let brain: PetBrain | null = null
let effects: Effects | null = null

loadModel()
  .then(({ pet, animations }) => {
    scene.add(pet)
    inspectRig(pet, animations)
    if (DEBUG) addSkeletonHelper(scene, pet)
    const rig = buildRig(pet)
    const clips = new ClipPlayer(pet, rig)
    animator = new Animator(pet, rig, clips) // empieza en idle
    effects = new Effects(scene, pet)
    brain = new PetBrain(animator, clips, effects)
  })
  .catch((err) => console.error('No se pudo cargar el modelo:', err))

let last = performance.now()
renderer.setAnimationLoop((now: number) => {
  // Tope de 0.1 s: si la ventana estuvo pausada no queremos un salto gigante
  const dt = Math.min(0.1, (now - last) / 1000)
  last = now
  brain?.update(dt) // primero decide (y mueve la ventana)...
  animator?.update(dt) // ...luego pose del frame
  effects?.update(dt)
  renderer.render(scene, camera)
  checkHover() // debe ir justo después de render: el píxel solo es legible en este mismo frame
})
