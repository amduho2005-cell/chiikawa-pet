import { app, BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { WINDOW_SIZE, START_MARGIN, DEBUG } from '../shared/config'
import { registerIpc } from './ipc'

function createWindow(): BrowserWindow {
  // Arranca en la esquina inferior derecha del área de trabajo (sin dock ni barra de menús)
  const { workArea } = screen.getPrimaryDisplay()

  const win = new BrowserWindow({
    width: WINDOW_SIZE,
    height: WINDOW_SIZE,
    x: workArea.x + workArea.width - WINDOW_SIZE - START_MARGIN,
    y: workArea.y + workArea.height - WINDOW_SIZE,
    transparent: true, // fondo transparente: solo se ve lo que dibuja Three.js
    frame: false, // sin barra de título ni bordes
    hasShadow: false, // en macOS la sombra marcaría el contorno de la ventana
    resizable: false,
    skipTaskbar: true, // Windows/Linux: no aparece en la barra de tareas
    alwaysOnTop: true,
    show: false, // se muestra cuando el contenido está listo, para evitar un parpadeo blanco
    webPreferences: {
      // contextIsolation y sandbox vienen activados y nodeIntegration desactivado por defecto
      preload: join(__dirname, '../preload/index.js')
    }
  })

  // Empieza dejando pasar los clics; el renderer lo desactiva cuando el cursor está sobre el modelo
  win.setIgnoreMouseEvents(true, { forward: true })

  // 'screen-saver' es el nivel más alto en macOS: queda encima incluso de apps en pantalla completa
  win.setAlwaysOnTop(true, 'screen-saver')
  win.once('ready-to-show', () => win.show())

  // En desarrollo electron-vite sirve el renderer por HTTP; en producción se carga el archivo compilado
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
    // La ventana es diminuta y sin marco: DevTools se abre aparte para leer la consola
    if (DEBUG) win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  // macOS no usa skipTaskbar: el equivalente es ocultar el icono del Dock
  app.dock?.hide()
  registerIpc()
  createWindow()
})

app.on('window-all-closed', () => app.quit())
