# Gestor tiempo

Aplicación para gestionar el tiempo personal: tareas en tablero, calendario, carpetas de proyectos, temporizador
pomodoro que registra horas y analíticas de productividad. Modo oscuro, en español.

Funciona en el navegador, como web con datos en la nube o como app de escritorio para Windows (con instalador).

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · framer-motion · lucide-react · Electron · Vitest · ESLint

## Funciones

- **Inicio** personalizable: los bloques (indicadores, agenda, prioridades, proyectos…) se colocan libremente en una
  cuadrícula de 12 columnas. Pulsa *Personalizar*, arrastra cada bloque a la celda que quieras y cambia su ancho.
- **Tareas** en tablero con filtros por carpeta, prioridad y búsqueda.
- **Calendario** por día, semana, mes o carpeta.
- **Proyectos**: cada carpeta lleva a sus tareas o se abre en su sitio con sus tareas y su cronograma.
- **Pomodoro** que registra el tiempo de foco en la tarea activa.
- **Analíticas**: foco por carpeta (barras sobre la línea) y tareas completadas (barras bajo la línea), por días o
  semanas, y exportación a CSV/JSON.

## Empezar

Requiere Node.js 20.19 o superior.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Comando             | Qué hace                                                        |
| ------------------- | --------------------------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo                                          |
| `npm run build`     | Comprueba tipos y compila la web en `dist/`                     |
| `npm start`         | Sirve `dist/` con la API de datos (`server.cjs`) en el puerto 3000 |
| `npm run desktop`   | Abre la app de escritorio sin empaquetar                        |
| `npm run installer` | Genera el instalador `release/GestorTiempo-Setup-<versión>.exe` |
| `npm test`          | Tests (Vitest)                                                  |
| `npm run lint`      | ESLint                                                          |
| `npm run typecheck` | TypeScript                                                      |

## Dónde se guardan los datos

La app siempre guarda en el `localStorage` del navegador. Si la sirve `server.cjs`, además sincroniza con la API
`/api/state`, que guarda todo en un archivo JSON. Así los datos son los mismos en cualquier dispositivo.

Variables de `server.cjs`:

| Variable       | Por defecto         | Para qué                                                     |
| -------------- | ------------------- | ------------------------------------------------------------ |
| `PORT`         | `3000`              | Puerto                                                       |
| `DATA_FILE`    | `gestor-datos.json` | Archivo donde se guardan los datos                           |
| `APP_PASSWORD` | —                   | Si se define, el navegador pide usuario y contraseña         |

Si dos dispositivos editan a la vez, gana el último que guarda.

## Desplegar

**Web con datos en la nube.** En un hosting que ejecute Node (Render, Railway, Fly…):

- Compilación: `npm install && npm run build`
- Arranque: `npm start`
- Define `APP_PASSWORD` (sin ella, cualquiera con el enlace ve y cambia los datos).
- Monta un disco persistente y apunta `DATA_FILE` a él, o los datos se pierden al reiniciar.

**Solo estático** (Netlify, GitHub Pages…): sube `dist/`. Funciona, pero cada navegador guarda sus propios datos.

**Escritorio (Windows).** `npm run installer` crea `release/GestorTiempo-Setup-<versión>.exe`: un asistente que deja
elegir la carpeta, crea accesos directos en el escritorio y el menú Inicio, y añade un desinstalador en *Aplicaciones
instaladas*. No pide permisos de administrador (se instala para el usuario actual). La app arranca el servidor por
dentro y guarda en `%APPDATA%\gestor-tiempo\gestor-datos.json`; desinstalarla no borra esos datos. Para que use la web
en la nube, crea en esa carpeta un `config.json` con `{"url": "https://tu-web"}`. El instalador no está firmado, así
que Windows SmartScreen puede avisar al abrirlo («Más información» → «Ejecutar de todas formas»).

## Estructura

```
index.html              Página de entrada de Vite
server.cjs              Servidor sin dependencias: sirve dist/ y la API /api/state
electron/main.cjs       App de escritorio: arranca server.cjs y lo muestra en una ventana
public/                 Archivos estáticos (favicon.svg = logo)
build/                  Icono de la app de escritorio (icon.svg → icon.png de 512 px)
src/
  main.tsx              Punto de entrada
  App.tsx               Layout: menú, cabecera, vista actual, panel de formularios, avisos, dock móvil
  routes.ts             Rutas (hash) → vista, con carga diferida
  actions.ts            Qué hace cada acción del usuario (mutación + aviso)
  types.ts, constants.ts
  store/
    store.ts            Estado inmutable, persistencia (localStorage + API) y suscripción
    mutations.ts        Cambios de estado con validación (ValidationError) y "deshacer"
    selectors.ts        Consultas puras sobre el estado
    layout.ts           Colocación de los bloques de Inicio en la cuadrícula
    timer.ts            Temporizador de foco
    task.ts, toasts.ts, sample.ts
  hooks/                useStore, useHashRoute, useNow/useMinute, useElementWidth
  components/
    blocks/             Componentes de interacción, cada uno con su .css
    layout/             Sidebar, Header, Drawer
    forms/              Formularios de tarea, evento y carpeta
    ui/                 Piezas de la app: tarjetas, pomodoro, carpetas, cuadrícula de Inicio, primitivas
  views/                Una vista por página
  lib/                  Utilidades sin dependencias de la app (fechas, formato, CSV…)
  data/releases.ts      Historial de versiones (página Releases)
  styles/main.css       Tailwind + tokens del design system
tests/                  Lógica, mutaciones, distribución de Inicio y renderizado de todas las vistas
```

## Decisiones

- **Estado inmutable**: `store.update(fn)` aplica la mutación sobre una copia; si lanza (p. ej. validación) no cambia
  nada. Las mutaciones son funciones puras y están cubiertas por tests.
- **Sin compactar la cuadrícula**: los huecos que deja el usuario en Inicio se respetan; si un bloque cae sobre otro,
  el de debajo baja de fila.
- **Tailwind v4** con los tokens en `@theme` (`src/styles/main.css`). Las clases se escriben completas en el código
  para que Tailwind las detecte.
- **Fuentes autoalojadas** (Geist vía Fontsource): la app no hace peticiones a terceros.
- **Datos versionados** (`SCHEMA_VERSION`): si cambia su forma, se sube la versión.
