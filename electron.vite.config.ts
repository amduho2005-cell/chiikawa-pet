import { defineConfig } from 'electron-vite'

// electron-vite compila tres "mundos": main (Node), preload (puente) y renderer (navegador).
// Con las rutas por defecto (src/main, src/preload, src/renderer) no hace falta configurar más.
export default defineConfig({
  main: {},
  preload: {},
  renderer: {}
})
