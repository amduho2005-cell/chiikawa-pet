import { BrowserWindow, ipcMain, screen } from 'electron'

/** Resultado de mover la ventana: -1/1 si chocó con el borde izquierdo/derecho (o superior/inferior), 0 si no. */
export interface MoveResult {
  hitX: -1 | 0 | 1
  hitY: -1 | 0 | 1
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

// setPosition solo acepta píxeles enteros: guardamos la posición con decimales aparte para que
// pasos de ~1 px por frame (60 px/s a 60 fps) se acumulen bien y el movimiento sea parejo
let exact: { x: number; y: number } | null = null

/** Registra los canales IPC que usa el renderer (a través de window.pet en el preload). */
export function registerIpc(): void {
  // Click-through: forward: true sigue enviando mousemove al renderer aunque ignore los clics,
  // así el renderer puede detectar cuándo el cursor vuelve a pasar sobre el personaje
  ipcMain.on('set-ignore-mouse', (event, ignore: unknown) => {
    if (typeof ignore !== 'boolean') return // lo que llega por IPC no es de fiar: validamos el tipo
    BrowserWindow.fromWebContents(event.sender)?.setIgnoreMouseEvents(ignore, { forward: true })
  })

  // Mueve la ventana (dx, dy) píxeles sin salirse del área de trabajo de su pantalla
  ipcMain.handle('move-by', (event, dx: unknown, dy: unknown): MoveResult => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || !Number.isFinite(dx) || !Number.isFinite(dy)) return { hitX: 0, hitY: 0 }
    const ddx = dx as number
    const ddy = dy as number

    const [wx, wy] = win.getPosition()
    const [w, h] = win.getSize()
    // Si alguien más movió la ventana, partimos de su posición real
    if (!exact || Math.round(exact.x) !== wx || Math.round(exact.y) !== wy) exact = { x: wx, y: wy }

    // workArea = pantalla sin Dock ni barra de menús (o barra de tareas en Windows)
    const area = screen.getDisplayNearestPoint({ x: wx + w / 2, y: wy + h / 2 }).workArea
    const maxX = area.x + area.width - w
    const maxY = area.y + area.height - h
    const x = clamp(exact.x + ddx, area.x, maxX)
    const y = clamp(exact.y + ddy, area.y, maxY)
    exact = { x, y }
    win.setPosition(Math.round(x), Math.round(y))

    return {
      hitX: ddx < 0 && x <= area.x ? -1 : ddx > 0 && x >= maxX ? 1 : 0,
      hitY: ddy < 0 && y <= area.y ? -1 : ddy > 0 && y >= maxY ? 1 : 0
    }
  })
}
