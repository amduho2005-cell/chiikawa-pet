// Constantes ajustables de la app. Las usan tanto el proceso main como el renderer.
// Iremos agregando aquí tiempos, BONE_MAP y parámetros de animación en los siguientes pasos.

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

/** Modo debug: dibuja el esqueleto y abre DevTools (en `npm run dev`) para ver la consola. */
export const DEBUG = true
