import { createScene } from './scene'
import { loadModel } from './model'
import { inspectRig, addSkeletonHelper } from './rig'
import { DEBUG } from '../shared/config'

const { renderer, scene, camera } = createScene()

loadModel()
  .then(({ pet, animations }) => {
    scene.add(pet)
    inspectRig(pet, animations)
    if (DEBUG) addSkeletonHelper(scene, pet)
  })
  .catch((err) => console.error('No se pudo cargar el modelo:', err))

// Bucle de render (~60 fps); aquí irán las animaciones en los siguientes pasos
renderer.setAnimationLoop(() => renderer.render(scene, camera))
