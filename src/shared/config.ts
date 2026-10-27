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

/** Muestra ayudas visuales (esqueleto, etc.). */
export const DEBUG = false
