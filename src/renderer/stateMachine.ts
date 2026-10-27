import { BEHAVIOR } from '../shared/config'
import { type Animator, type PoseFn, Pendulum, cry, hangPose, idle, makeWalk } from './procedural'
import type { ClipName, ClipPlayer } from './clips'
import type { Effects } from './effects'

type State = 'idle' | 'walk' | 'drag' | 'fall' | 'cry' | ClipName

const randomIn = ([min, max]: readonly [number, number]) => min + Math.random() * (max - min)

// Una sola función por dirección: Animator.play reconoce si ya está sonando y no reinicia la mezcla
const walkRight = makeWalk(1)
const walkLeft = makeWalk(-1)

/**
 * Decide qué hace la mascota. Cada estado tiene un temporizador; al agotarse se elige el siguiente.
 * - IDLE: espera 4–10 s y luego camina o se queda quieta otra vez.
 * - WALK: mueve la ventana a velocidad constante; al chocar con un borde da la vuelta.
 * - HAPPY: reproduce su clip y, cuando termina, vuelve a IDLE.
 * - DRAG: la ventana sigue al cursor y el cuerpo se balancea como un péndulo.
 * - FALL: al soltarla cae con gravedad hasta el borde inferior del área de trabajo.
 * - LAND: rebota dos veces al tocar el suelo y vuelve a IDLE.
 * - CRY (doble clic): tiembla y llora unos segundos, luego vuelve a IDLE.
 */
export class PetBrain {
  private state: State = 'idle'
  private timer = randomIn(BEHAVIOR.idleTime)
  private dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1

  private pendulum = new Pendulum()
  // La pose colgando lee el ángulo actual del péndulo en cada frame
  private hang: PoseFn = () => hangPose(this.pendulum.angle)
  private dragTarget: { x: number; y: number } | null = null
  private lastDragX: number | null = null
  private dragVx = 0 // velocidad horizontal del arrastre, suavizada (px/s)
  private fallVy = 0 // velocidad de caída (px/s)

  constructor(
    private animator: Animator,
    private clips: ClipPlayer,
    private effects: Effects
  ) {
    clips.onFinished = (name) => {
      if (name === this.state) this.enterIdle()
    }
  }

  /** Clic sobre el personaje. */
  onClick(): void {
    if (this.state === 'drag' || this.state === 'fall') return
    this.enterClip('happy')
  }

  /** Doble clic: easter egg, llora. */
  onDoubleClick(): void {
    if (this.state === 'drag' || this.state === 'fall') return
    this.setState('cry')
    this.timer = BEHAVIOR.cryTime
    this.animator.play(cry)
  }

  onDragStart(): void {
    this.setState('drag')
    this.pendulum = new Pendulum() // empieza quieto, igual que la pose de la que viene
    this.lastDragX = null
    this.dragVx = 0
    this.animator.play(this.hang)
  }

  onDragMove(x: number, y: number): void {
    this.dragTarget = { x, y } // se aplica en update(), como mucho una vez por frame
  }

  onDragEnd(): void {
    this.setState('fall')
    this.fallVy = 0
  }

  update(dt: number): void {
    this.timer -= dt

    switch (this.state) {
      case 'idle':
        if (this.timer > 0) return
        if (Math.random() < BEHAVIOR.walkChance) this.enterWalk()
        else this.enterIdle() // se queda quieta otro rato
        return

      case 'walk':
        // La ventana se mueve, no el modelo
        window.pet.moveBy(this.dir * BEHAVIOR.walkSpeed * dt, 0).then(({ hitX }) => {
          // La respuesta llega un poco después: comprobamos que siga caminando hacia ese mismo borde
          if (this.state === 'walk' && hitX === this.dir) this.turnAround()
        })
        if (this.timer <= 0) this.enterIdle()
        return

      case 'drag': {
        let rawVx = 0
        if (this.dragTarget) {
          if (this.lastDragX !== null && dt > 0) rawVx = (this.dragTarget.x - this.lastDragX) / dt
          this.lastDragX = this.dragTarget.x
          window.pet.moveTo(this.dragTarget.x, this.dragTarget.y)
          this.dragTarget = null
        }
        // Suavizado: el mouse manda eventos irregulares y la velocidad cruda da tirones
        this.dragVx += (rawVx - this.dragVx) * Math.min(1, dt / BEHAVIOR.dragSmoothing)
        this.pendulum.update(dt, this.dragVx)
        return
      }

      case 'fall':
        // Gravedad simple: la velocidad crece en cada frame; el péndulo sigue balanceándose hacia el reposo
        this.fallVy += BEHAVIOR.gravity * dt
        this.pendulum.update(dt, 0)
        window.pet.moveBy(0, this.fallVy * dt).then(({ hitY }) => {
          if (this.state === 'fall' && hitY === 1) this.enterClip('land')
        })
        return

      case 'cry':
        if (this.timer <= 0) this.enterIdle()
        return
    }
    // HAPPY y LAND esperan a que su clip termine (onFinished)
  }

  /** Cambia de estado y enciende/apaga los efectos (lágrimas) que le correspondan. */
  private setState(state: State): void {
    this.state = state
    this.effects.setState(state)
  }

  private enterIdle(): void {
    this.setState('idle')
    this.timer = randomIn(BEHAVIOR.idleTime)
    this.animator.play(idle)
  }

  private enterWalk(): void {
    this.setState('walk')
    this.timer = randomIn(BEHAVIOR.walkTime)
    // Elige dirección al azar para que no camine siempre hacia el mismo lado
    this.dir = Math.random() < 0.5 ? 1 : -1
    this.animator.play(this.dir === 1 ? walkRight : walkLeft)
  }

  private enterClip(name: ClipName): void {
    this.setState(name)
    this.animator.play(idle) // deja de caminar/colgar y sigue respirando encima del clip
    this.clips.play(name)
  }

  private turnAround(): void {
    this.dir = this.dir === 1 ? -1 : 1
    this.animator.play(this.dir === 1 ? walkRight : walkLeft)
  }
}
