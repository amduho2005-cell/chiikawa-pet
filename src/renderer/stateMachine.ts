import { BEHAVIOR } from '../shared/config'
import { type Animator, idle, makeWalk } from './procedural'

type State = 'idle' | 'walk'

const randomIn = ([min, max]: readonly [number, number]) => min + Math.random() * (max - min)

// Una sola función por dirección: Animator.play reconoce si ya está sonando y no reinicia la mezcla
const walkRight = makeWalk(1)
const walkLeft = makeWalk(-1)

/**
 * Decide qué hace la mascota. Cada estado tiene un temporizador; al agotarse se elige el siguiente.
 * - IDLE: espera 4–10 s y luego camina o se queda quieta otra vez.
 * - WALK: mueve la ventana a velocidad constante; al chocar con un borde da la vuelta.
 */
export class PetBrain {
  private state: State = 'idle'
  private timer = randomIn(BEHAVIOR.idleTime)
  private dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1

  constructor(private animator: Animator) {}

  update(dt: number): void {
    this.timer -= dt

    if (this.state === 'idle') {
      if (this.timer > 0) return
      if (Math.random() < BEHAVIOR.walkChance) this.enterWalk()
      else this.enterIdle() // se queda quieta otro rato
      return
    }

    // WALK: la ventana se mueve, no el modelo
    window.pet.moveBy(this.dir * BEHAVIOR.walkSpeed * dt, 0).then(({ hitX }) => {
      // La respuesta llega un poco después: comprobamos que siga caminando hacia ese mismo borde
      if (this.state === 'walk' && hitX === this.dir) this.turnAround()
    })
    if (this.timer <= 0) this.enterIdle()
  }

  private enterIdle(): void {
    this.state = 'idle'
    this.timer = randomIn(BEHAVIOR.idleTime)
    this.animator.play(idle)
  }

  private enterWalk(): void {
    this.state = 'walk'
    this.timer = randomIn(BEHAVIOR.walkTime)
    // Elige dirección al azar para que no camine siempre hacia el mismo lado
    this.dir = Math.random() < 0.5 ? 1 : -1
    this.animator.play(this.dir === 1 ? walkRight : walkLeft)
  }

  private turnAround(): void {
    this.dir = this.dir === 1 ? -1 : 1
    this.animator.play(this.dir === 1 ? walkRight : walkLeft)
  }
}
