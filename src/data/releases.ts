export interface Release {
  version: string;
  date: string;
  changes: Partial<Record<'Nuevo' | 'Mejorado' | 'Corregido', string[]>>;
}

export const RELEASES: Release[] = [
  {
    version: 'v0.8.0',
    date: '19 nov 2026',
    changes: {
      Nuevo: [
        'Inicio personalizable: cuadrícula de 12 columnas donde cada bloque se arrastra y se redimensiona, respetando los huecos',
        'Las carpetas se abren en su sitio para ver sus tareas y su cronograma',
        'Sincronización con la nube a través de la API del servidor (/api/state), con contraseña opcional',
        'App de escritorio para Windows (.exe portable con Electron)',
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
