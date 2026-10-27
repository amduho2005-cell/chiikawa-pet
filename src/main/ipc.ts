import { BrowserWindow, ipcMain, screen } from 'electron'

/** Resultado de mover la ventana: -1/1 si chocó con el borde izquierdo/derecho (o superior/inferior), 0 si no. */
export interface MoveResult {
  hitX: -1 | 0 | 1
  hitY: -1 | 0 | 1
}

const NO_HIT: MoveResult = { hitX: 0, hitY: 0 }
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

// setPosition solo acepta píxeles enteros: guardamos la posición con decimales aparte para que
// pasos de ~1 px por frame (60 px/s a 60 fps) se acumulen bien y el movimiento sea parejo
let exact: { x: number; y: number } | null = null

/** Posición actual con decimales; si alguien más movió la ventana, parte de su posición real. */
function currentPosition(win: BrowserWindow): { x: number; y: number } {
  const [wx, wy] = win.getPosition()
  if (!exact || Math.round(exact.x) !== wx || Math.round(exact.y) !== wy) exact = { x: wx, y: wy }
  return exact
}

/**
 * Lleva la ventana a (x, y) sin salirse del área de trabajo de la pantalla más cercana.
 * (dx, dy) es la dirección del movimiento, para saber contra qué borde chocó.
 */
function placeWindow(win: BrowserWindow, x: number, y: number, dx: number, dy: number): MoveResult {
  const [w, h] = win.getSize()
  // workArea = pantalla sin Dock ni barra de menús (o barra de tareas en Windows)
  const area = screen.getDisplayNearestPoint({ x: Math.round(x + w / 2), y: Math.round(y + h / 2) }).workArea
  const maxX = area.x + area.width - w
  const maxY = area.y + area.height - h
  const cx = clamp(x, area.x, maxX)
  const cy = clamp(y, area.y, maxY)
  exact = { x: cx, y: cy }
  win.setPosition(Math.round(cx), Math.round(cy))
  return {
    hitX: dx < 0 && cx <= area.x ? -1 : dx > 0 && cx >= maxX ? 1 : 0,
    hitY: dy < 0 && cy <= area.y ? -1 : dy > 0 && cy >= maxY ? 1 : 0
  }
}

/** Registra los canales IPC que usa el renderer (a través de window.pet en el preload). */
export function registerIpc(): void {
  // Click-through: forward: true sigue enviando mousemove al renderer aunque ignore los clics,
  // así el renderer puede detectar cuándo el cursor vuelve a pasar sobre el personaje
  ipcMain.on('set-ignore-mouse', (event, ignore: unknown) => {
    if (typeof ignore !== 'boolean') return // lo que llega por IPC no es de fiar: validamos el tipo
    BrowserWindow.fromWebContents(event.sender)?.setIgnoreMouseEvents(ignore, { forward: true })
  })

  // Mueve la ventana (dx, dy) píxeles (caminar, caer)
  ipcMain.handle('move-by', (event, dx: unknown, dy: unknown): MoveResult => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || !Number.isFinite(dx) || !Number.isFinite(dy)) return NO_HIT
    const pos = currentPosition(win)
    return placeWindow(win, pos.x + (dx as number), pos.y + (dy as number), dx as number, dy as number)
  })

  // Lleva la ventana a una posición de pantalla (arrastrar)
  ipcMain.handle('move-to', (event, x: unknown, y: unknown): MoveResult => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || !Number.isFinite(x) || !Number.isFinite(y)) return NO_HIT
    const pos = currentPosition(win)
    return placeWindow(win, x as number, y as number, (x as number) - pos.x, (y as number) - pos.y)
  })
}
