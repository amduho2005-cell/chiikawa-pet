import { BrowserWindow, ipcMain } from 'electron'

/** Registra los canales IPC que usa el renderer (a través de window.pet en el preload). */
export function registerIpc(): void {
  // Click-through: forward: true sigue enviando mousemove al renderer aunque ignore los clics,
  // así el renderer puede detectar cuándo el cursor vuelve a pasar sobre el personaje
  ipcMain.on('set-ignore-mouse', (event, ignore: unknown) => {
    if (typeof ignore !== 'boolean') return // lo que llega por IPC no es de fiar: validamos el tipo
    BrowserWindow.fromWebContents(event.sender)?.setIgnoreMouseEvents(ignore, { forward: true })
  })
}
