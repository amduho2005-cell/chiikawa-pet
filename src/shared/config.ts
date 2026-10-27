// Constantes ajustables de la app. Las usan tanto el proceso main como el renderer.
// Con `npm run dev` corriendo, los cambios aquí se ven al instante.

/** Tamaño de la ventana en píxeles (cuadrada). */
export const WINDOW_SIZE = 250

/** Margen en píxeles entre la ventana y el borde inferior/derecho del área de trabajo al arrancar. */
export const START_MARGIN = 40

/**
 * Mitad del alto/ancho visible por la cámara ortográfica, en unidades de la escena.
 * El modelo se normaliza a 1 unidad de tamaño máximo, así que 0.65 deja aire alrededor
 * (lo necesitaremos para saltos y squash & stretch).
 */
export const CAMERA_HALF_SIZE = 0.65

/** Altura (en unidades de escena) donde quedan los pies del modelo; negativo = abajo del centro. */
export const FLOOR_Y = -0.55

/**
 * Qué hueso del modelo corresponde a cada parte del cuerpo.
 * "Izquierda" = izquierda del personaje (a la derecha de la pantalla, porque mira a la cámara).
 * Si cambias de modelo, corre `npm run dev` con DEBUG = true y mira la tabla de huesos en la consola.
 * Una parte que falte (o cuyo hueso no exista) simplemente no se anima.
 */
export const BONE_MAP = {
  hips: 'Bone_001',
  spine: 'Bone_008',
  chest: 'Bone_007',
  head: 'Bone_010',
  armL: 'Bone_016',
  forearmL: 'Bone_015',
  armR: 'Bone_013',
  forearmR: 'Bone_012',
  legL: 'Bone_006',
  legR: 'Bone_004'
  // Este modelo no tiene huesos de orejas ni ojos: earL, earR, eyes quedan sin mapear
} as const satisfies Record<string, string>

/**
 * "Feeling" de las animaciones. Ángulos en radianes (0.1 rad ≈ 6°), tiempos en segundos,
 * squash como fracción (0.03 = 3 % más alto).
 */
export const ANIM = {
  /** Duración de la mezcla al cambiar de una animación a otra. */
  blendTime: 0.25,
  idle: {
    breathPeriod: 3.2, // un ciclo de respiración
    breathAmount: 0.03, // cuánto se estira al inhalar
    swayPeriod: 4.6, // balanceo del cuerpo
    bodySway: 0.025,
    headPeriod: 5.3, // periodo distinto al del cuerpo para que no se vea mecánico
    headSway: 0.07, // inclinación lateral de la cabeza
    headNod: 0.03, // asiente un poquito al respirar
    armBreath: 0.08 // los brazos se abren al inhalar
  },
  walk: {
    stepsPerSecond: 3, // pasos (= saltitos) por segundo
    hopHeight: 0.025, // altura de cada saltito
    squash: 0.04, // estirado en el aire / aplastado al tocar el suelo
    waddle: 0.08, // tambaleo lateral
    legSwing: 0.35, // cuánto se adelanta cada pierna
    armSwing: 0.3, // vaivén de los brazos
    facing: 0.6 // giro hacia la dirección de avance (0 = de frente, 1.57 = de perfil)
  },
  /** Mezcla cuando un clip interrumpe a otro (crossFadeTo). */
  clipFade: 0.3,
  happy: {
    rise: 0.22, // subida del saltito
    fall: 0.22, // bajada
    bounce: 0.25, // rebotecito al caer
    jumpHeight: 0.08, // altura del salto (unidades de escena; sube CAMERA_HALF_SIZE si lo quieres más alto)
    bounceHeight: 0.3, // altura del rebote, como fracción del salto
    kickSpeed: 4, // pataleos por segundo en el aire
    kickAngle: 0.35 // amplitud del pataleo
  },
  drag: {
    pivotHeight: 0.6, // altura del punto del que cuelga (≈ la cabeza; el modelo mide 1)
    maxAngle: 0.35, // balanceo máximo (más de ~0.4 y se sale de la ventana)
    swingPerSpeed: 0.0006, // cuánto se inclina por cada px/s de arrastre
    stiffness: 60, // fuerza del "resorte": más alto = balanceo más rápido
    damping: 2.5, // freno: más bajo = se balancea más veces antes de quedarse quieto
    legLag: 0.6 // las piernas exageran el balanceo
  },
  cry: {
    trembleSpeed: 12, // temblores por segundo
    trembleAngle: 0.03, // amplitud del temblor
    headDown: 0.12, // cabeza gacha
    tearRate: 10, // lágrimas por segundo
    tearSize: 7, // tamaño de cada lágrima (px)
    tearSpeed: 0.25, // velocidad inicial con la que salen
    tearGravity: 2.5, // gravedad de las lágrimas (unidades de escena/s²)
    // Posición de los ojos en el personaje (y=0 pies, el modelo mide 1). Ajusta si no salen de los ojos
    eyeX: 0.13,
    eyeY: 0.62,
    eyeZ: 0.45
  },
  land: {
    bounce1: 0.22, // duración del primer rebote
    height1: 0.05, // altura del primer rebote
    bounce2: 0.16,
    height2: 0.02
  }
}

/** Comportamiento (máquina de estados). Rangos [mín, máx] en segundos. */
export const BEHAVIOR = {
  idleTime: [4, 10] as const, // cuánto se queda quieta antes de decidir qué hacer
  walkTime: [3, 8] as const, // cuánto camina antes de volver a IDLE
  walkChance: 0.6, // probabilidad de caminar al terminar IDLE (si no, se queda quieta)
  walkSpeed: 60, // píxeles por segundo
  dragThreshold: 4, // píxeles que hay que mover con el botón apretado para que cuente como arrastre
  dragSmoothing: 0.08, // suavizado de la velocidad del arrastre (segundos)
  gravity: 2500, // aceleración de la caída (px/s²)
  doubleClickTime: 0.25, // ventana para el doble clic (s); el clic simple espera esto antes de saltar
  cryTime: 3 // cuánto llora tras el doble clic (s)
}

/** Modo debug: dibuja el esqueleto y abre DevTools (en `npm run dev`) para ver la consola. */
export const DEBUG = false
