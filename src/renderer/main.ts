import { createScene } from './scene'
import { loadModel } from './model'

const { renderer, scene, camera } = createScene()

loadModel()
  .then((pet) => scene.add(pet))
  .catch((err) => console.error('No se pudo cargar el modelo:', err))

// Bucle de render (~60 fps); aquí irán las animaciones en los siguientes pasos
renderer.setAnimationLoop(() => renderer.render(scene, camera))
