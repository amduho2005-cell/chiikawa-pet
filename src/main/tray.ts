import { BrowserWindow, Menu, Tray, app, nativeImage } from 'electron'
import { readFileSync } from 'node:fs'
// ?asset: electron-vite copia el archivo al build y nos da su ruta (funciona en dev y empaquetado)
import iconPath from '../../assets/icons/tray.png?asset'

// Referencia a nivel de módulo: si el Tray se queda sin referencias, el recolector de basura lo borra
let tray: Tray | null = null

/** Crea el icono de la bandeja del sistema con su menú. */
export function createTray(win: BrowserWindow): void {
  // El PNG mide 32 px: con scaleFactor 2 se ve a 16 px nítido en pantallas Retina
  const icon = nativeImage.createFromBuffer(readFileSync(iconPath), { scaleFactor: 2 })
  // macOS: imagen "plantilla" = el sistema la pinta en blanco o negro según el tema de la barra
  if (process.platform === 'darwin') icon.setTemplateImage(true)

  tray = new Tray(icon)
  tray.setToolTip('Chiikawa')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Mostrar/Ocultar',
        // showInactive: aparece sin robarle el foco a la app que estés usando
        click: () => (win.isVisible() ? win.hide() : win.showInactive())
      },
      // Se activa en el paso de SLEEP, cuando exista la máquina de estados que lo reciba
      { label: 'Dormir', enabled: false },
      {
        label: 'Siempre encima',
        type: 'checkbox',
        checked: true,
        click: (item) => win.setAlwaysOnTop(item.checked, 'screen-saver')
      },
      { type: 'separator' },
      { label: 'Salir', click: () => app.quit() }
    ])
  )
}
