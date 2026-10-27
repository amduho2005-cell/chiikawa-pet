// Funciones matemáticas puras para animar (sin Three.js, para poder probarlas con node --test).
// Todas las de easing reciben t entre 0 y 1 y devuelven el progreso "con estilo".

export const TAU = Math.PI * 2

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Arranca y termina suave (curva de seno). */
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

/**
 * Squash & stretch conservando volumen: si el alto se multiplica por scaleY,
 * el ancho y el fondo se multiplican por 1/√scaleY (así alto × ancho × fondo sigue valiendo 1).
 */
export const squashXZ = (scaleY: number) => 1 / Math.sqrt(scaleY)
