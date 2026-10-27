import * as THREE from 'three'
import { ANIM, FLOOR_Y } from '../shared/config'
import { TAU } from './easing'
import { type PoseFn, NO_ROTATION, bodyRotation, bodyScale, boneOffset, restPose } from './procedural'
import type { Part, Rig, RigBone } from './rig'

// Acciones puntuales (empiezan y terminan en reposo). Se escriben como funciones de pose,
// igual que las animaciones en bucle, y luego se "hornean" en un AnimationClip con keyframes.

export type ClipName = 'happy' | 'land'

/**
 * Clic: un saltito con un rebotecito al caer, agitando las piernas en el aire.
 * No mueve los brazos: son tan cortos que al girarlos deforman el torso y la cabeza.
 */
const happy: PoseFn = (t) => {
  const c = ANIM.happy
  const p = restPose()
  if (t < c.rise) {
    p.lift = c.jumpHeight * Math.sin(((t / c.rise) * Math.PI) / 2) // sube rápido y frena arriba
  } else if (t < c.rise + c.fall) {
    const u = (t - c.rise) / c.fall
    p.lift = c.jumpHeight * (1 - u * u) // cae acelerando, como con gravedad
  } else {
    const u = Math.min(1, (t - c.rise - c.fall) / c.bounce)
    p.lift = c.jumpHeight * c.bounceHeight * Math.sin(u * Math.PI) // rebotecito más bajo
  }
  // Pataleo alternado; su fuerza depende de la altura, así que en el suelo las piernas quedan quietas
  const kick = Math.sin(t * TAU * c.kickSpeed) * c.kickAngle * (p.lift / c.jumpHeight)
  p.bones = { legL: [kick, 0, 0], legR: [-kick, 0, 0] }
  return p
}
const happyDuration = () => ANIM.happy.rise + ANIM.happy.fall + ANIM.happy.bounce

/** Aterrizaje tras soltarlo: dos rebotes, cada uno más bajito (sin aplastar el cuerpo). */
const land: PoseFn = (t) => {
  const c = ANIM.land
  const p = restPose()
  if (t < c.bounce1) p.lift = c.height1 * Math.sin((t / c.bounce1) * Math.PI)
  else p.lift = c.height2 * Math.sin(Math.min(1, (t - c.bounce1) / c.bounce2) * Math.PI)
  return p
}

/** Fotogramas por segundo al hornear: el mixer interpola entre ellos. */
const FPS = 30

/**
 * Convierte una función de pose en un AnimationClip: la evalúa FPS veces por segundo y guarda
 * los valores en pistas de keyframes (VectorKeyframeTrack para posición/escala, Quaternion para rotaciones).
 * Las pistas del cuerpo usan nombres ".position" (= el objeto raíz del mixer, el grupo "pet").
 */
function bake(name: ClipName, duration: number, fn: PoseFn, rig: Rig): THREE.AnimationClip {
  const times: number[] = []
  const position: number[] = []
  const scale: number[] = []
  const rotation: number[] = []
  const bones = (Object.entries(rig) as [Part, RigBone][]).map(([part, rb]) => ({ part, rb, values: [] as number[] }))
  const q = new THREE.Quaternion()

  const frames = Math.ceil(duration * FPS)
  for (let i = 0; i <= frames; i++) {
    const t = Math.min(duration, i / FPS)
    const p = fn(t)
    times.push(t)
    position.push(p.offsetX, FLOOR_Y + p.lift, 0)
    scale.push(...bodyScale(p))
    rotation.push(...bodyRotation(p, q).toArray())
    for (const { part, rb, values } of bones) {
      // Valor absoluto del hueso: giro (en ejes del personaje) aplicado sobre el reposo
      values.push(...boneOffset(rb, p.bones[part] ?? NO_ROTATION, q).multiply(rb.rest).toArray())
    }
  }

  return new THREE.AnimationClip(name, duration, [
    new THREE.VectorKeyframeTrack('.position', times, position),
    new THREE.VectorKeyframeTrack('.scale', times, scale),
    new THREE.QuaternionKeyframeTrack('.quaternion', times, rotation),
    ...bones.map(({ rb, values }) => new THREE.QuaternionKeyframeTrack(`${rb.bone.name}.quaternion`, times, values))
  ])
}

/**
 * Reproduce los clips con un AnimationMixer (el reproductor de animaciones de Three.js).
 * Cada clip es una AnimationAction que se reproduce una sola vez; si uno interrumpe a otro,
 * se mezclan con crossFadeTo durante ANIM.clipFade segundos.
 */
export class ClipPlayer {
  private mixer: THREE.AnimationMixer
  private actions: Record<ClipName, THREE.AnimationAction>
  private current: THREE.AnimationAction | null = null
  private pending: THREE.AnimationAction | null = null

  /** Se llama cuando un clip termina solo (no cuando otro lo interrumpe). */
  onFinished: (name: ClipName) => void = () => {}

  constructor(pet: THREE.Object3D, rig: Rig) {
    this.mixer = new THREE.AnimationMixer(pet)
    const action = (name: ClipName, fn: PoseFn, duration: number) => {
      const a = this.mixer.clipAction(bake(name, duration, fn, rig))
      a.setLoop(THREE.LoopOnce, 1)
      return a
    }
    this.actions = {
      happy: action('happy', happy, happyDuration()),
      land: action('land', land, ANIM.land.bounce1 + ANIM.land.bounce2)
    }

    this.mixer.addEventListener('finished', (e) => {
      if (e.action !== this.current) return
      this.current = null
      this.onFinished(e.action.getClip().name as ClipName)
    })
  }

  play(name: ClipName): void {
    // Se arranca dentro de update(): ahí el modelo está en su pose base, que es lo que el mixer
    // memoriza como "pose original" para mezclar al entrar y salir del clip
    this.pending = this.actions[name]
  }

  /** Llamar con el modelo en su pose base (capa 0 del Animator). */
  update(dt: number): void {
    const next = this.pending
    if (next) {
      this.pending = null
      next.reset().play()
      if (this.current && this.current !== next) this.current.crossFadeTo(next, ANIM.clipFade, false)
      this.current = next
    }
    this.mixer.update(dt)
  }
}
