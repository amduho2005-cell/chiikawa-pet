import { contextBridge, ipcRenderer } from 'electron'

// El preload corre antes que la página y es el único puente entre renderer y main.
// contextBridge expone solo estas funciones como window.pet; la página nunca toca Node ni ipcRenderer.
const api = {
  /** true = los clics atraviesan la ventana; false = la ventana los recibe. */
  setIgnoreMouse: (ignore: boolean) => ipcRenderer.send('set-ignore-mouse', ignore)
}

contextBridge.exposeInMainWorld('pet', api)

export type PetApi = typeof api
