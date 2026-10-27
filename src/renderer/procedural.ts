import * as THREE from 'three'
import { ANIM } from '../shared/config'
import { TAU, easeInOutSine, lerp, squashXZ } from './easing'
import type { Part, Rig, RigBone } from './rig'
import type { ClipPlayer } from './clips'

/** Ángulos en radianes [x, y, z], en ejes del personaje: x = asentir, y = girar, z = inclinar de lado. */
export type Angles = [number, number, number]

/**
 * Una "pose": cómo se ve el personaje en un instante. Las animaciones no tocan el modelo,
 * solo devuelven poses; el Animator las mezcla y las aplica.
 */
export interface Pose {
  /** Desplazamiento lateral del cuerpo (unidades de escena). */
  offsetX: number
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

export const NO_ROTATION: Angles = [0, 0, 0]
export const restPose = (): Pose => ({ offsetX: 0, lift: 0, squash: 0, tiltX: 0, tiltZ: 0, turn: 0, bones: {} })

function lerpPose(a: Pose, b: Pose, w: number): Pose {
  const bones: Pose['bones'] = {}
  const parts = new Set([...Object.keys(a.bones), ...Object.keys(b.bones)]) as Set<Part>
  for (const part of parts) {
    const pa = a.bones[part] ?? NO_ROTATION
    const pb = b.bones[part] ?? NO_ROTATION
    bones[part] = [lerp(pa[0], pb[0], w), lerp(pa[1], pb[1], w), lerp(pa[2], pb[2], w)]
  }
  return {
    offsetX: lerp(a.offsetX, b.offsetX, w),
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
    offsetX: 0,
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
      offsetX: 0,
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

/** Llorar (doble clic): temblor rápido de lado a lado con la cabeza gacha. No mueve los brazos. */
export const cry: PoseFn = (t) => {
  const c = ANIM.cry
  const p = restPose()
  p.tiltZ = Math.sin(t * TAU * c.trembleSpeed) * c.trembleAngle
  p.bones = { head: [c.headDown, 0, 0] }
  return p
}

/**
 * Péndulo amortiguado para el arrastre. Un "resorte" empuja el ángulo hacia un objetivo
 * (que depende de la velocidad del arrastre) y la amortiguación lo va frenando: al parar
 * de mover el mouse, el personaje sigue balanceándose unas veces hasta quedarse quieto.
 */
export class Pendulum {
  /** Radianes; positivo = los pies se van hacia la derecha. */
  angle = 0
  private velocity = 0

  /** vx = velocidad horizontal del punto de agarre (px/s). */
  update(dt: number, vx: number): void {
    const c = ANIM.drag
    // Al arrastrar hacia la derecha el cuerpo se queda atrás (pies a la izquierda) y viceversa
    const target = Math.max(-c.maxAngle, Math.min(c.maxAngle, -vx * c.swingPerSpeed))
    const accel = -c.stiffness * (this.angle - target) - c.damping * this.velocity
    this.velocity += accel * dt
    this.angle += this.velocity * dt
    // Tope: al llegar al ángulo máximo se frena ahí, en vez de quedarse "empujando" contra el límite
    if (Math.abs(this.angle) > c.maxAngle) {
      this.angle = Math.sign(this.angle) * c.maxAngle
      this.velocity = 0
    }
  }
}

/**
 * Pose colgando de la cabeza con un ángulo de péndulo. tiltZ gira sobre los pies, así que se
 * compensa con offsetX y lift para que el punto fijo sea ANIM.drag.pivotHeight (a la altura de la cabeza).
 */
export function hangPose(angle: number): Pose {
  const c = ANIM.drag
  const p = restPose()
  p.tiltZ = angle
  p.offsetX = c.pivotHeight * Math.sin(angle)
  p.lift = c.pivotHeight * (1 - Math.cos(angle))
  // Las piernas cuelgan y se quedan un poco atrás del balanceo
  p.bones = { legL: [0, 0, angle * c.legLag], legR: [0, 0, angle * c.legLag] }
  return p
}

// --- Motor ---

const euler = new THREE.Euler()
const tmp = new THREE.Quaternion()

/**
 * Pasa un giro expresado en ejes del personaje a ejes locales del hueso: padre⁻¹ · giro · padre.
 * Multiplicado por delante de la rotación actual del hueso, lo gira "en ejes del personaje".
 */
export function boneOffset(rb: RigBone, angles: Angles, out: THREE.Quaternion): THREE.Quaternion {
  out.setFromEuler(euler.fromArray(angles))
  return out.premultiply(tmp.copy(rb.parentRest).invert()).multiply(rb.parentRest)
}

/** Rotación de todo el cuerpo de una pose (inclinaciones + giro). */
export const bodyRotation = (p: Pose, out: THREE.Quaternion) => out.setFromEuler(euler.set(p.tiltX, p.turn, p.tiltZ))

/** Escala [x, y, z] de una pose: squash & stretch conservando volumen. */
export function bodyScale(p: Pose): [number, number, number] {
  const scaleY = 1 + p.squash
  const xz = squashXZ(scaleY)
  return [xz, scaleY, xz]
}

const q = new THREE.Quaternion()
const v = new THREE.Vector3()

/**
 * Arma la pose de cada frame en capas:
 * 0. se deshace la capa procedural del frame anterior, quedando la "pose base"
 *    (reposo, o lo que haya dejado el clip),
 * 1. los clips (acciones puntuales como happy) escriben sus valores sobre la base,
 * 2. se guarda la base y la animación procedural en bucle se SUMA encima
 *    (por eso respira incluso mientras salta).
 * Ojo: el AnimationMixer solo reescribe un valor cuando cambia, por eso no podemos resetear
 * todo al reposo en cada frame: un brazo que el clip mantiene quieto arriba se quedaría abajo.
 * Al cambiar de animación procedural no salta: mezcla desde la pose que se veía hacia la nueva
 * durante ANIM.blendTime segundos.
 */
export class Animator {
  private fn: PoseFn = idle
  private t = 0
  private blend = 1
  private from = restPose()
  private current = restPose()
  private bones: [Part, RigBone][]
  // Pose base guardada (sin la capa procedural)
  private basePosition: THREE.Vector3
  private baseQuaternion: THREE.Quaternion
  private baseScale: THREE.Vector3
  private baseBones: THREE.Quaternion[]

  constructor(
    private pet: THREE.Object3D,
    rig: Rig,
    private clips: ClipPlayer
  ) {
    this.bones = Object.entries(rig) as [Part, RigBone][]
    // Al construir, el modelo está en reposo: esa es la primera pose base
    this.basePosition = pet.position.clone()
    this.baseQuaternion = pet.quaternion.clone()
    this.baseScale = pet.scale.clone()
    this.baseBones = this.bones.map(([, rb]) => rb.bone.quaternion.clone())
  }

  play(fn: PoseFn): void {
    if (fn === this.fn) return
    this.from = this.current
    this.fn = fn
    this.t = 0
    this.blend = 0
  }

  /** dt = segundos desde el frame anterior (así la velocidad no depende de los fps). */
  update(dt: number): void {
    // Capa 0: vuelve a la pose base (deshace la procedural del frame anterior)
    this.pet.position.copy(this.basePosition)
    this.pet.quaternion.copy(this.baseQuaternion)
    this.pet.scale.copy(this.baseScale)
    this.bones.forEach(([, rb], i) => rb.bone.quaternion.copy(this.baseBones[i]))

    // Capa 1: clips
    this.clips.update(dt)

    // Capa 2: guarda la base y suma la procedural encima
    this.basePosition.copy(this.pet.position)
    this.baseQuaternion.copy(this.pet.quaternion)
    this.baseScale.copy(this.pet.scale)
    this.bones.forEach(([, rb], i) => this.baseBones[i].copy(rb.bone.quaternion))

    this.t += dt
    this.blend = Math.min(1, this.blend + dt / ANIM.blendTime)
    this.current = lerpPose(this.from, this.fn(this.t), easeInOutSine(this.blend))
    const p = this.current
    this.pet.position.x += p.offsetX
    this.pet.position.y += p.lift
    this.pet.scale.multiply(v.fromArray(bodyScale(p)))
    this.pet.quaternion.multiply(bodyRotation(p, q))
    for (const [part, rb] of this.bones) rb.bone.quaternion.premultiply(boneOffset(rb, p.bones[part] ?? NO_ROTATION, q))
  }
}
