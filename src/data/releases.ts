export interface Release {
  version: string;
  date: string;
  changes: Partial<Record<'Nuevo' | 'Mejorado' | 'Corregido', string[]>>;
}

export const RELEASES: Release[] = [
  {
    version: 'v0.10.0',
    date: '19 nov 2026',
    changes: {
      Nuevo: [
        'Proyectos es ahora un desplegable del menú lateral: cada carpeta se abre en Resumen, Tareas, Gantt, Chat, Documentos y Notas, y la sección «Carpetas» desaparece',
        'Fases por carpeta y un cascader Carpeta › Fase en el formulario de tarea',
        'Calendario nuevo: mes, semana, día, agenda y vista por carpeta, con arrastrar para mover y redimensionar eventos',
        'Gantt nuevo por proyecto, con filas por fase: arrastra una barra para cambiar el inicio y la fecha límite de la tarea',
        'Kanban nuevo en Tareas, con la fase de cada tarjeta',
        'Chat de proyecto con burbujas y avatares a ambos lados',
      ],
      Mejorado: [
        'Móvil: campos a 16 px (sin zoom al enfocar), teclado numérico en los números, sin destello al tocar ni zoom por doble toque, y «Enviar» como tecla de retorno en el chat',
        'Las columnas del kanban son un carrusel que encaja de una en una, con resistencia elástica al llegar al final',
        'Botones que reaccionan al pulsar, errores de formulario que sacuden el campo, páginas que entran según hacia dónde navegas y ramas del menú que se abren suaves',
        'Esqueletos de carga y vidrio líquido con refracción (cabecera, panel lateral y dock) y de menú (avisos y ventanas emergentes), sobre un fondo ambiental',
        'La búsqueda espera a que dejes de teclear; el servidor comprime con Brotli y guarda en caché los archivos compilados',
        'Las tareas pueden tener fecha de inicio propia',
        'Tus datos de la versión anterior se migran solos al actualizar',
      ],
    },
  },
  {
    version: 'v0.9.0',
    date: '19 nov 2026',
    changes: {
      Nuevo: [
        'Proyectos se puede ver como página o como árbol de carpetas: cada proyecto se despliega en Resumen, Tareas, Gantt, Chat, Documentos y Notas',
        'Cada proyecto tiene su mini-dashboard: tareas, cronograma, chat con los participantes y documentos y notas compartidos',
        'Participantes por carpeta, con chat donde se puede escribir como cualquiera de ellos',
        'Inicio: paleta para añadir bloques, incluidos proyectos y tareas concretos, arrastrándolos a la cuadrícula',
      ],
      Mejorado: [
        'Inicio: todos los bloques miden lo mismo y se colocan sin huecos',
        'Tus datos de la versión anterior se migran solos al actualizar',
      ],
    },
  },
  {
    version: 'v0.8.0',
    date: '19 nov 2026',
    changes: {
      Nuevo: [
        'Inicio personalizable: cuadrícula de 12 columnas donde cada bloque se arrastra y se redimensiona, respetando los huecos',
        'Las carpetas se abren en su sitio para ver sus tareas y su cronograma',
        'Sincronización con la nube a través de la API del servidor (/api/state), con contraseña opcional',
        'App de escritorio para Windows con instalador (Electron)',
      ],
      Mejorado: ['Iconos en lugar de emojis en los tipos de evento', 'La leyenda de Analíticas explica las barras bajo la línea (tareas completadas)'],
    },
  },
  {
    version: 'v0.7.0',
    date: '18 nov 2026',
    changes: {
      Nuevo: [
        'Menú "Crear" para añadir tareas, eventos y carpetas desde cualquier página',
        'Avisos apilados con "Deshacer" al borrar',
        'Filtro de varias carpetas a la vez en el tablero',
        'Acciones rápidas en cada carpeta',
        'Gráfico de foco por carpeta (días/semanas) en Analíticas',
        'Dock de navegación en móvil',
        'Restablecer datos se confirma con un código',
      ],
      Mejorado: ['App migrada a React + TypeScript', 'Campos de formulario con etiqueta flotante', 'Mientras hay un formulario abierto, el resto de la app queda inactiva'],
    },
  },
  {
    version: 'v0.6.0',
    date: '17 nov 2026',
    changes: {
      Mejorado: [
        'Proyecto organizado en módulos con Vite y Tailwind compilado',
        'Validación de formularios y datos guardados',
        'Tests automáticos de la lógica de fechas, temporizador y datos',
        'Fuentes e iconos servidos desde la propia app (sin peticiones a terceros)',
      ],
    },
  },
  {
    version: 'v0.5.0',
    date: '17 nov 2026',
    changes: {
      Nuevo: [
        'Estética Obsidian Chrono en modo oscuro',
        'Tablero de tareas con arrastrar y soltar',
        'Temporizador pomodoro que registra las horas por tarea',
        'Calendario semanal editable',
        'Analíticas con exportación a CSV',
      ],
    },
  },
  {
    version: 'v0.4.0',
    date: '15 nov 2026',
    changes: { Nuevo: ['Vista semanal del calendario', 'Carpetas de proyectos con progreso'], Corregido: ['El temporizador no se pausaba al cambiar de pestaña'] },
  },
  { version: 'v0.3.0', date: '28 oct 2026', changes: { Nuevo: ['Prioridades en tareas'], Mejorado: ['Resumen de horas en Inicio más rápido'] } },
  { version: 'v0.2.0', date: '10 oct 2026', changes: { Nuevo: ['Ajustes de jornada laboral y pomodoro'] } },
  { version: 'v0.1.0', date: '22 sep 2026', changes: { Nuevo: ['Primera versión: tareas y temporizador básico'] } },
];
