import * as THREE from 'three'
import { BONE_MAP } from '../shared/config'

/** Partes del cuerpo que se pueden animar (las claves de BONE_MAP). */
export type Part = keyof typeof BONE_MAP

export interface RigBone {
  bone: THREE.Bone
  /** Rotación local del hueso en reposo; las animaciones se aplican como desplazamientos sobre ella. */
  rest: THREE.Quaternion
  /** Rotación del padre en reposo, relativa al personaje: permite expresar los ángulos en ejes del personaje. */
  parentRest: THREE.Quaternion
}

export type Rig = Partial<Record<Part, RigBone>>

/**
 * Busca los huesos del BONE_MAP y guarda su pose de reposo.
 * Si un hueso no existe se avisa en consola y esa parte simplemente no se anima.
 */
export function buildRig(pet: THREE.Object3D): Rig {
  pet.updateMatrixWorld(true)
  const petInv = pet.getWorldQuaternion(new THREE.Quaternion()).invert()
  const rig: Rig = {}

  for (const [part, name] of Object.entries(BONE_MAP) as [Part, string][]) {
    const bone = pet.getObjectByName(name)
    if (!(bone instanceof THREE.Bone) || !bone.parent) {
      console.warn(`BONE_MAP: no existe el hueso "${name}" (${part}); esa parte no se animará`)
      continue
    }
    const parentRest = petInv.clone().multiply(bone.parent.getWorldQuaternion(new THREE.Quaternion()))
    rig[part] = { bone, rest: bone.quaternion.clone(), parentRest }
  }
  return rig
}

/**
 * Imprime en consola lo que trae el modelo para poder armar el BONE_MAP:
 * 1. la jerarquía de nodos (con su tipo),
 * 2. todos los huesos con su padre y su posición (en unidades del grupo "pet": y=0 son los pies),
 * 3. las animaciones incluidas en el .glb.
 */
export function inspectRig(pet: THREE.Object3D, animations: THREE.AnimationClip[]): void {
  pet.updateMatrixWorld(true)

  // 1. Jerarquía: una línea por nodo, indentada según su profundidad
  const lines: string[] = []
  const walk = (obj: THREE.Object3D, depth: number) => {
    lines.push(`${'  '.repeat(depth)}${obj.name || '(sin nombre)'} [${obj.type}]`)
    obj.children.forEach((child) => walk(child, depth + 1))
  }
  walk(pet, 0)
  console.log('🌳 Jerarquía de nodos:\n' + lines.join('\n'))

  // 2. Huesos: nombre, padre y posición. x>0 es la derecha de la pantalla
  const bones: Record<string, { padre: string; x: string; y: string; z: string }> = {}
  const pos = new THREE.Vector3()
  pet.traverse((obj) => {
    if (!(obj instanceof THREE.Bone)) return
    pet.worldToLocal(obj.getWorldPosition(pos))
    bones[obj.name] = {
      padre: obj.parent?.name ?? '-',
      x: pos.x.toFixed(2),
      y: pos.y.toFixed(2),
      z: pos.z.toFixed(2)
    }
  })
  console.log(`🦴 Huesos (${Object.keys(bones).length}):`)
  console.table(bones)

  // 3. Animaciones que ya trae el archivo
  if (animations.length === 0) console.log('🎬 El .glb no trae animaciones')
  else console.table(animations.map((a) => ({ nombre: a.name, duracion_s: a.duration.toFixed(2) })))
}

/** Dibuja el esqueleto encima del modelo (líneas de colores). Solo para depurar. */
export function addSkeletonHelper(scene: THREE.Scene, pet: THREE.Object3D): void {
  const helper = new THREE.SkeletonHelper(pet)
  // Sin depthTest las líneas se ven aunque queden dentro de la malla
  ;(helper.material as THREE.LineBasicMaterial).depthTest = false
  scene.add(helper)
}
