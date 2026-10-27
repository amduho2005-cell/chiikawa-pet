import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import modelUrl from '../../assets/models/chiikawa.glb?url'
import { FLOOR_Y } from '../shared/config'

/**
 * Carga el .glb y lo devuelve envuelto en un grupo "pet" normalizado:
 * - tamaño máximo (ancho o alto) = 1 unidad,
 * - centrado en X/Z,
 * - con el origen del grupo en los pies, para que el squash & stretch se apoye en el suelo.
 * También devuelve las animaciones que traiga el archivo (puede ser una lista vacía).
 */
export async function loadModel(): Promise<{ pet: THREE.Group; animations: THREE.AnimationClip[] }> {
  const gltf = await new GLTFLoader().loadAsync(modelUrl)
  const model = gltf.scene

  // Escala: que la dimensión más grande (ancho o alto) mida 1
  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  model.scale.setScalar(1 / Math.max(size.x, size.y))

  // Recalcula tras escalar y mueve el modelo para que la base quede en y=0 y el centro en x=z=0
  box.setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  model.position.set(-center.x, -box.min.y, -center.z)

  // El grupo exterior es el que animaremos (squash, saltos); su origen = los pies
  const pet = new THREE.Group()
  pet.name = 'pet'
  pet.add(model)
  pet.position.y = FLOOR_Y
  return { pet, animations: gltf.animations }
}
