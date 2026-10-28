# Chiikawa Pet

Desktop pet 3D de Chiikawa hecha con Electron, Vite, TypeScript y Three.js. Vive encima de tus ventanas,
camina por la pantalla y reacciona cuando la tocas.

| Acción | Qué hace |
|---|---|
| Nada | Respira y, cada tanto, camina de un lado a otro de la pantalla |
| Clic | Da un saltito pataleando |
| Doble clic | Llora (easter egg) |
| Arrastrar | Cuelga y se balancea como un péndulo; al soltarla cae y rebota |

Las zonas transparentes de la ventana dejan pasar los clics al escritorio. El menú del icono de la barra
de menús (bandeja en Windows) tiene **Mostrar/Ocultar**, **Siempre encima** y **Salir**.

## Descargar

Todos los instaladores están en **[Releases](https://github.com/amduho2005-cell/chiikawa-pet/releases/latest)**.

| Sistema | Archivo | Cómo instalar |
|---|---|---|
| **Windows** (10 / 11, 64 bits) | [`Chiikawa_Pet_Setup_0_1_0.exe`](https://github.com/amduho2005-cell/chiikawa-pet/releases/latest/download/Chiikawa_Pet_Setup_0_1_0.exe) (~121 MB) | Abre el `.exe` y sigue el instalador. Si aparece SmartScreen: **Más información** → **Ejecutar de todas formas** (la app no está firmada). |
| **macOS** con Apple Silicon (M1, M2, M3…) | `Chiikawa Pet-<versión>-arm64.dmg` | Abre el `.dmg`, arrastra **Chiikawa Pet** a **Aplicaciones** y la primera vez haz clic derecho → **Abrir** → **Abrir** (la app no está firmada). |

Para compilarla tú misma, sigue los pasos de abajo.

## Requisitos

- [Node.js](https://nodejs.org) 22 o superior
- [Git LFS](https://git-lfs.com), porque el modelo `.glb` se guarda con LFS:

  ```bash
  # macOS
  brew install git-lfs
  # Windows: ya viene incluido con Git for Windows

  git lfs install
  ```

## Instalación y uso

```bash
npm install
npm run dev
```

Si al arrancar aparece `Electron uninstall`, falta el binario de Electron:

```bash
node node_modules/electron/install.js
```

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Abre la app en modo desarrollo, con recarga automática |
| `npm run build` | Revisa tipos (TypeScript estricto) y compila a `out/` |
| `npm run package` | Compila y genera el instalador en `release/` |
| `npm test` | Autocomprobación de las funciones matemáticas |

## Empaquetar

```bash
npm run package
```

Genera `release/Chiikawa Pet-<versión>-arm64.dmg` (macOS con Apple Silicon). La configuración está en
`electron-builder.yml`:

- **macOS Intel**: cambia `arch: arm64` por `x64`, o por `universal` para ambos.
- **Windows** (`.exe` instalador): `npx electron-builder --win`.
- **Linux** (`.AppImage`): `npx electron-builder --linux`. En Linux el click-through no funciona bien:
  Electron no reenvía el movimiento del mouse a ventanas que ignoran clics.

La app **no está firmada**. La primera vez:

- **macOS**: clic derecho sobre la app → **Abrir** → **Abrir**.
- **Windows**: en el aviso de SmartScreen → **Más información** → **Ejecutar de todas formas**.

El icono de la app es `build/icon.png` (1024 × 1024, fondo transparente); electron-builder genera solo los
formatos de cada sistema. El de la barra de menús es `assets/icons/tray.png` (32 × 32, negro sobre
transparente).

## Reemplazar el modelo

1. Pon tu modelo en `assets/models/chiikawa.glb`. Tiene que tener esqueleto (huesos); no hace falta que
   traiga animaciones, todas se crean por código.
2. En `src/shared/config.ts` pon `DEBUG = true` y corre `npm run dev`. Se abre DevTools con:
   - la jerarquía de nodos,
   - una tabla con todos los huesos, su padre y su posición (y = 0 son los pies, el modelo mide 1),
   - las animaciones que traiga el archivo.

   Además se dibuja el esqueleto encima del modelo.
3. Con esa tabla, ajusta `BONE_MAP` en `config.ts`: a cada parte del cuerpo (`head`, `armL`, `legR`…) le
   corresponde el nombre de un hueso. "Izquierda" es la izquierda **del personaje**, que queda a la derecha
   de la pantalla porque mira a la cámara. Si una parte no existe en tu modelo, bórrala: esa parte
   simplemente no se anima.
4. Si el personaje queda cortado o muy chico, ajusta `CAMERA_HALF_SIZE` (más grande = más lejos) y
   `FLOOR_Y` (altura de los pies).
5. Ajusta `ANIM.cry.eyeX` / `eyeY` para que las lágrimas salgan de los ojos.
6. Vuelve a poner `DEBUG = false`.

## Ajustar las animaciones

Todos los números del "feeling" están en `src/shared/config.ts`. Los ángulos van en radianes
(0.1 rad ≈ 6°) y los tiempos en segundos. Con `npm run dev` corriendo, los cambios se ven al instante.

| Sección | Controla |
|---|---|
| `ANIM.blendTime` | Suavidad al pasar de una animación a otra |
| `ANIM.idle` | Respiración y balanceo en reposo |
| `ANIM.walk` | Saltitos, tambaleo, piernas y giro al caminar |
| `ANIM.happy` | El saltito del clic: altura, velocidad, rebote, pataleo |
| `ANIM.drag` | El péndulo al arrastrar: `stiffness` (rapidez), `damping` (cuánto tarda en calmarse), `maxAngle` |
| `ANIM.land` | Los dos rebotes al aterrizar |
| `ANIM.cry` | Temblor, lágrimas y posición de los ojos |
| `BEHAVIOR` | Cuánto espera antes de caminar, probabilidad y velocidad de caminar, gravedad, doble clic, duración del llanto |

Si una animación sale al revés (un brazo baja en vez de subir, gira hacia el lado contrario), cambia el
signo del valor correspondiente.

Consejo: este modelo tiene brazos muy cortos y al girarlos mucho deforman el torso y la cabeza. Mantén los
movimientos de brazos pequeños.

### Agregar una animación nueva

Cada animación es una función que recibe los segundos desde que empezó y devuelve una **pose**
(elevación, inclinación y un ángulo por hueso, en ejes del personaje: x = asentir, y = girar,
z = inclinar de lado).

- **En bucle** (como caminar): escribe la función en `src/renderer/procedural.ts` y reprodúcela con
  `animator.play(miAnimacion)` desde `src/renderer/stateMachine.ts`.
- **Acción puntual** (como el saltito): escríbela en `src/renderer/clips.ts`, agrégala a `ClipName` y a
  `this.actions`, y reprodúcela con `enterClip('nombre')`. Se convierte sola en un `AnimationClip` con
  keyframes y vuelve a IDLE al terminar.

## Estructura

```
src/
├── shared/config.ts        constantes ajustables (todo el "feeling" está aquí)
├── main/                   proceso principal (Node)
│   ├── index.ts            ventana transparente, siempre encima
│   ├── tray.ts             icono y menú de la barra de menús
│   └── ipc.ts              mover la ventana y click-through
├── preload/index.ts        puente seguro (window.pet) entre la página y el main
└── renderer/               la página (Three.js)
    ├── scene.ts            cámara, luces y renderer transparente
    ├── model.ts            carga y normaliza el .glb
    ├── rig.ts              inspección del esqueleto y BONE_MAP → huesos
    ├── procedural.ts       animaciones en bucle, péndulo y motor de capas
    ├── clips.ts            acciones puntuales como AnimationClip
    ├── stateMachine.ts     qué hace la mascota y cuándo
    ├── effects.ts          lágrimas
    └── input.ts            click-through, clic, doble clic y arrastre
```

## Créditos

Modelo 3D: hecho por Amelia con [Meshy](https://www.meshy.ai).

Chiikawa es un personaje de Nagano. Este es un proyecto de fans sin fines comerciales.