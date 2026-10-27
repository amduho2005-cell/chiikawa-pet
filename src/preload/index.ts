import { contextBridge, ipcRenderer } from 'electron'
import type { MoveResult } from '../main/ipc'

// El preload corre antes que la página y es el único puente entre renderer y main.
// contextBridge expone solo estas funciones como window.pet; la página nunca toca Node ni ipcRenderer.
const api = {
  /** true = los clics atraviesan la ventana; false = la ventana los recibe. */
  setIgnoreMouse: (ignore: boolean) => ipcRenderer.send('set-ignore-mouse', ignore),
  /** Mueve la ventana (dx, dy) píxeles; responde si chocó con algún borde del área de trabajo. */
  moveBy: (dx: number, dy: number): Promise<MoveResult> => ipcRenderer.invoke('move-by', dx, dy)
}

contextBridge.exposeInMainWorld('pet', api)

export type PetApi = typeof api
