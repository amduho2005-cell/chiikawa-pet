import * as THREE from 'three'
import { ANIM, FLOOR_Y } from '../shared/config'
import { TAU, easeInOutSine, lerp, squashXZ } from './easing'
import type { Part, Rig } from './rig'

/** Ángulos en radianes [x, y, z], en ejes del personaje: x = asentir, y = girar, z = inclinar de lado. */
export type Angles = [number, number, number]

/**
 * Una "pose": cómo se ve el personaje en un instante. Las animaciones no tocan el modelo,
 * solo devuelven poses; el Animator las mezcla y las aplica.
 */
export interface Pose {
  /** Elevación del cuerpo sobre el suelo (unidades de escena). */
  lift: number
  /** Squash & stretch: +0.1 = 10 % más alto (y más delgado), -0.1 = aplastado. */
  squash: number
  /** Inclinación de todo el cuerpo, pivotando en los pies (radianes). */
  tiltX: number
  tiltZ: number
  /** Giro de todo el cuerpo sobre el eje vertical: 0 = mira a la cámara, + = mira a la derecha. */
  turn: number
  /** Desplazamientos de cada hueso respecto a su pose de reposo. */
  bones: Partial<Record<Part, Angles>>
}

/** Una animación procedural: recibe los segundos desde que empezó y devuelve la pose. */
export type PoseFn = (t: number) => Pose

const NO_ROTATION: Angles = [0, 0, 0]
const restPose = (): Pose => ({ lift: 0, squash: 0, tiltX: 0, tiltZ: 0, turn: 0, bones: {} })

function lerpPose(a: Pose, b: Pose, w: number): Pose {
  const bones: Pose['bones'] = {}
  const parts = new Set([...Object.keys(a.bones), ...Object.keys(b.bones)]) as Set<Part>
  for (const part of parts) {
    const pa = a.bones[part] ?? NO_ROTATION
    const pb = b.bones[part] ?? NO_ROTATION
    bones[part] = [lerp(pa[0], pb[0], w), lerp(pa[1], pb[1], w), lerp(pa[2], pb[2], w)]
  }
  return {
    lift: lerp(a.lift, b.lift, w),
    squash: lerp(a.squash, b.squash, w),
    tiltX: lerp(a.tiltX, b.tiltX, w),
    tiltZ: lerp(a.tiltZ, b.tiltZ, w),
    turn: lerp(a.turn, b.turn, w),
    bones
  }
}

// --- Animaciones en bucle ---

/** Respiración (squash & stretch suave), balanceo leve del cuerpo y de la cabeza. */
export const idle: PoseFn = (t) => {
  const c = ANIM.idle
  const breath = Math.sin((t / c.breathPeriod) * TAU)
  const sway = Math.sin((t / c.swayPeriod) * TAU)
  const head = Math.sin((t / c.headPeriod) * TAU)
  return {
    lift: 0,
    squash: breath * c.breathAmount,
    tiltX: 0,
    tiltZ: sway * c.bodySway,
    turn: 0,
    bones: {
      head: [breath * c.headNod, 0, head * c.headSway],
      // Al inhalar los bracitos se abren un poquito (z+ sube el brazo izquierdo, z- el derecho)
      armL: [0, 0, breath * c.armBreath],
      armR: [0, 0, -breath * c.armBreath]
    }
  }
}

/**
 * Caminar hacia la derecha (dir = 1) o la izquierda (dir = -1): saltitos, tambaleo,
 * piernas y brazos alternados, y el cuerpo girado hacia donde va.
 */
export function makeWalk(dir: 1 | -1): PoseFn {
  return (t) => {
    const c = ANIM.walk
    // hop es 0 al tocar el suelo y 1 en lo alto del saltito (un saltito por paso)
    const hop = Math.abs(Math.sin(Math.PI * t * c.stepsPerSecond))
    // swing cambia de signo en cada paso: sirve para alternar piernas, brazos y tambaleo
    const swing = Math.sin(Math.PI * t * c.stepsPerSecond)
    return {
      lift: hop * c.hopHeight,
      // Estirado en el aire, aplastado al tocar el suelo
      squash: (hop * 2 - 1) * c.squash,
      tiltX: 0,
      tiltZ: swing * c.waddle,
      turn: dir * c.facing,
      bones: {
        legL: [swing * c.legSwing, 0, 0],
        legR: [-swing * c.legSwing, 0, 0],
        // Brazos al revés que las piernas, como al caminar de verdad
        armL: [-swing * c.armSwing, 0, 0],
        armR: [swing * c.armSwing, 0, 0],
        head: [0, 0, -swing * c.waddle * 0.5] // la cabeza compensa un poco el tambaleo
      }
    }
  }
}

// --- Motor ---

const euler = new THREE.Euler()
const offset = new THREE.Quaternion()

/**
 * Reproduce una PoseFn por frame. Al cambiar de animación no salta: mezcla desde la pose
 * que se veía en ese momento hacia la nueva durante ANIM.blendTime segundos.
 */
export class Animator {
  private fn: PoseFn = idle
  private t = 0
  private blend = 1
  private from = restPose()
  private current = restPose()

  constructor(
    private pet: THREE.Object3D,
    private rig: Rig
  ) {}

  play(fn: PoseFn): void {
    if (fn === this.fn) return
    this.from = this.current
    this.fn = fn
    this.t = 0
    this.blend = 0
  }

  /** dt = segundos desde el frame anterior (así la velocidad no depende de los fps). */
  update(dt: number): void {
    this.t += dt
    this.blend = Math.min(1, this.blend + dt / ANIM.blendTime)
    this.current = lerpPose(this.from, this.fn(this.t), easeInOutSine(this.blend))
    this.apply(this.current)
  }

  private apply(p: Pose): void {
    // Capa A: cuerpo completo. El origen del grupo está en los pies, así que escala y gira apoyado en el suelo
    const scaleY = 1 + p.squash
    const xz = squashXZ(scaleY)
    this.pet.scale.set(xz, scaleY, xz)
    this.pet.position.y = FLOOR_Y + p.lift
    this.pet.rotation.x = p.tiltX
    this.pet.rotation.z = p.tiltZ
    this.pet.rotation.y = p.turn

    // Capa B: huesos. local = padre⁻¹ · desplazamiento · padre · reposo
    // (pasa el desplazamiento de ejes del personaje a ejes del hueso y lo aplica sobre el reposo)
    for (const [part, rb] of Object.entries(this.rig) as [Part, NonNullable<Rig[Part]>][]) {
      offset.setFromEuler(euler.fromArray(p.bones[part] ?? NO_ROTATION))
      rb.bone.quaternion.copy(rb.parentRest).invert().multiply(offset).multiply(rb.parentRest).multiply(rb.rest)
    }
  }
}
