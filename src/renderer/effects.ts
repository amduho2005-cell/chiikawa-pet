import * as THREE from 'three'
import { ANIM, FLOOR_Y } from '../shared/config'

/** Máximo de lágrimas en pantalla a la vez (se reutilizan). */
const MAX_TEARS = 40
/** Posición de una lágrima "apagada": fuera de la vista. */
const HIDDEN_Y = -100

/** Una gotita redonda con borde suave, dibujada en un canvas y usada como textura de cada partícula. */
function dropTexture(): THREE.Texture {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.9)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

/**
 * Efectos alrededor del personaje según el estado:
 * CRY: lágrimas como partículas simples (THREE.Points) que salen de los ojos y caen con gravedad.
 */
export class Effects {
  private positions = new Float32Array(MAX_TEARS * 3).fill(HIDDEN_Y)
  private velocities = new Float32Array(MAX_TEARS * 3)
  private alive = new Array<boolean>(MAX_TEARS).fill(false)
  private tears: THREE.Points
  private crying = false
  private spawnTimer = 0
  private nextSlot = 0
  private nextEye: 1 | -1 = 1
  private eye = new THREE.Vector3()

  constructor(
    scene: THREE.Scene,
    private pet: THREE.Object3D
  ) {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.tears = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: 0x8fd3ff,
        map: dropTexture(),
        // Con sizeAttenuation false el tamaño es en píxeles del dispositivo: multiplicamos por la densidad
        size: ANIM.cry.tearSize * window.devicePixelRatio,
        sizeAttenuation: false,
        transparent: true,
        depthWrite: false
      })
    )
    this.tears.frustumCulled = false // sus posiciones cambian cada frame; no vale la pena recalcular su caja
    scene.add(this.tears)
  }

  /** Activa o apaga los efectos según el estado de la máquina de estados. */
  setState(state: string): void {
    this.crying = state === 'cry'
  }

  update(dt: number): void {
    const c = ANIM.cry

    // Nuevas lágrimas mientras llora, alternando ojo izquierdo y derecho
    if (this.crying) {
      this.spawnTimer -= dt
      while (this.spawnTimer <= 0) {
        this.spawnTimer += 1 / c.tearRate
        this.spawn()
      }
    }

    // Mover las vivas: gravedad y desaparecen al llegar al suelo
    let any = false
    for (let i = 0; i < MAX_TEARS; i++) {
      if (!this.alive[i]) continue
      any = true
      const j = i * 3
      this.velocities[j + 1] -= c.tearGravity * dt
      this.positions[j] += this.velocities[j] * dt
      this.positions[j + 1] += this.velocities[j + 1] * dt
      if (this.positions[j + 1] < FLOOR_Y) {
        this.alive[i] = false
        this.positions[j + 1] = HIDDEN_Y
      }
    }
    if (any || this.crying) this.tears.geometry.attributes.position.needsUpdate = true
  }

  private spawn(): void {
    const c = ANIM.cry
    const i = this.nextSlot
    this.nextSlot = (this.nextSlot + 1) % MAX_TEARS // si no hay hueco, se recicla la más vieja
    // Posición del ojo en coordenadas del personaje → coordenadas de la escena (sigue el temblor)
    this.pet.localToWorld(this.eye.set(this.nextEye * c.eyeX, c.eyeY, c.eyeZ))
    const j = i * 3
    this.positions.set([this.eye.x, this.eye.y, this.eye.z], j)
    // Salen un poquito hacia afuera y hacia arriba antes de caer
    this.velocities.set([this.nextEye * c.tearSpeed * (0.6 + Math.random() * 0.8), c.tearSpeed * 0.5, 0], j)
    this.alive[i] = true
    this.nextEye = this.nextEye === 1 ? -1 : 1
  }
}
