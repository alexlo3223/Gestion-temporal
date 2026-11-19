import { describe, expect, it } from 'vitest';
import {
  ValidationError,
  deleteEvent,
  deleteProject,
  deleteTask,
  moveTask,
  restoreEvent,
  restoreTask,
  saveEvent,
  saveProject,
  saveTask,
  toggleTask,
  updateSettings,
} from '../src/store/mutations';
import { dailyFocus, daySlots, filterTasks, ganttBars, projectStats, weeklyFocus } from '../src/store/selectors';
import { createSampleData } from '../src/store/sample';
import { startTimer } from '../src/store/timer';
import { NOW, TODAY, createId, createState, ctx } from './fixtures';

const validTask = { title: 'Nueva', description: '', projectId: 'p1', priority: 'alta', estimateMin: '45', due: TODAY };
const validEvent = { title: 'Reunión', projectId: 'p1', kind: 'reunion', date: TODAY, start: '10:00', end: '11:00' };
const noFilters = { projects: [], priority: 'all' as const, query: '' };

describe('tareas', () => {
  it('crea y edita una tarea', () => {
    const state = createState();
    const { task, created } = saveTask(state, validTask, ctx());
    expect(created).toBe(true);
    expect(task).toMatchObject({ title: 'Nueva', estimateMin: 45, status: 'todo', spentMin: 0 });
    saveTask(state, { ...validTask, id: task.id, title: '  Editada  ' }, ctx());
    expect(state.tasks.find((t) => t.id === task.id)?.title).toBe('Editada');
  });

  it('rechaza datos no válidos', () => {
    const state = createState();
    expect(() => saveTask(state, { ...validTask, title: '   ' }, ctx())).toThrow(ValidationError);
    expect(() => saveTask(state, { ...validTask, projectId: 'nope' }, ctx())).toThrow(ValidationError);
    expect(() => saveTask(state, { ...validTask, priority: 'máxima' }, ctx())).toThrow(ValidationError);
    expect(() => saveTask(state, { ...validTask, estimateMin: '-5' }, ctx())).toThrow(ValidationError);
    expect(() => saveTask(state, { ...validTask, due: '17/11/2026' }, ctx())).toThrow(ValidationError);
  });

  it('completar guarda la fecha y detiene su temporizador registrando el tiempo', () => {
    const state = createState();
    startTimer(state, 't1', ctx());
    moveTask(state, 't1', 'done', ctx({ now: NOW + 10 * 60_000 }));
    expect(state.tasks[0]).toMatchObject({ status: 'done', doneAt: TODAY, spentMin: 10 });
    expect(state.timer.taskId).toBeNull();
  });

  it('toggleTask alterna entre pendiente y completada', () => {
    const state = createState();
    expect(toggleTask(state, 't1', ctx())).toBe('done');
    expect(toggleTask(state, 't1', ctx())).toBe('todo');
    expect(state.tasks[0].doneAt).toBe('');
  });

  it('borrar y deshacer devuelve la tarea a su sitio', () => {
    const state = createState();
    startTimer(state, 't1', ctx());
    const { task, index } = deleteTask(state, 't1');
    expect(state.tasks.map((t) => t.id)).toEqual(['t2']);
    expect(state.timer.taskId).toBeNull();
    restoreTask(state, task, index);
    restoreTask(state, task, index); // deshacer dos veces no la duplica
    expect(state.tasks.map((t) => t.id)).toEqual(['t1', 't2']);
  });

  it('filterTasks combina carpetas, prioridad y búsqueda y ordena por prioridad', () => {
    const state = createState();
    expect(filterTasks(state, noFilters).map((t) => t.id)).toEqual(['t2', 't1']);
    expect(filterTasks(state, { ...noFilters, priority: 'normal' }).map((t) => t.id)).toEqual(['t1']);
    expect(filterTasks(state, { ...noFilters, query: 'tarea 2' }).map((t) => t.id)).toEqual(['t2']);
    expect(filterTasks(state, { ...noFilters, projects: ['otra'] })).toEqual([]);
  });

  it('los filtros rápidos se suman entre sí', () => {
    const state = createState();
    state.tasks.push({ ...state.tasks[0], id: 't3', due: '2026-11-10' });
    const ids = (quick: ('today' | 'late' | 'nodate')[]) => filterTasks(state, { ...noFilters, quick }, TODAY).map((t) => t.id).sort();
    expect(ids(['today'])).toEqual(['t1']);
    expect(ids(['late'])).toEqual(['t3']);
    expect(ids(['nodate'])).toEqual(['t2']);
    expect(ids(['today', 'late'])).toEqual(['t1', 't3']);
  });

  it('el error de validación dice qué campo falla', () => {
    const state = createState();
    expect(() => saveTask(state, { ...validTask, title: '' }, ctx())).toThrow(expect.objectContaining({ field: 'title' }));
    expect(() => saveEvent(state, { ...validEvent, end: '09:00' }, ctx())).toThrow(expect.objectContaining({ field: 'end' }));
  });
});

describe('franjas y cronograma', () => {
  it('daySlots marca ocupadas las franjas que se solapan o no caben en la jornada', () => {
    const state = createState(); // jornada 9–18
    saveEvent(state, { ...validEvent, start: '10:00', end: '11:00' }, ctx());
    const free = (duration: number, ignoreId?: string) =>
      Object.fromEntries(daySlots(state, TODAY, { duration, ignoreId }).map((s) => [s.time, s.free]));
    expect(free(30)).toMatchObject({ '09:00': true, '09:30': true, '10:00': false, '10:30': false, '11:00': true, '17:30': true });
    expect(free(60)).toMatchObject({ '09:30': false, '17:00': true, '17:30': false });
    expect(free(30, state.events[0].id)['10:00']).toBe(true);
  });

  it('ganttBars termina cada barra en su fecha y la alarga según la estimación', () => {
    const state = createState(); // jornada de 9 h = 540 min
    state.tasks[0].estimateMin = 1000; // 2 jornadas
    state.tasks[1].due = '2026-11-20';
    state.tasks[1].estimateMin = 0; // hito
    const bars = ganttBars(state, '2026-11-16', 28);
    expect(bars.map((b) => [b.task.id, b.start, b.span])).toEqual([
      ['t1', 0, 2],
      ['t2', 4, 0],
    ]);
    expect(ganttBars(state, '2026-12-01', 28)).toEqual([]);
  });
});

describe('eventos', () => {
  it('valida que el fin sea posterior al inicio', () => {
    const state = createState();
    expect(() => saveEvent(state, { ...validEvent, end: '10:00' }, ctx())).toThrow('posterior');
    expect(() => saveEvent(state, { ...validEvent, start: '25:00' }, ctx())).toThrow(ValidationError);
    expect(saveEvent(state, validEvent, ctx()).created).toBe(true);
  });

  it('borrar y deshacer un evento', () => {
    const state = createState();
    const { event: created } = saveEvent(state, validEvent, ctx());
    const { event, index } = deleteEvent(state, created.id);
    expect(state.events).toHaveLength(0);
    restoreEvent(state, event, index);
    expect(state.events).toEqual([created]);
  });
});

describe('carpetas', () => {
  it('no permite borrar una carpeta con tareas', () => {
    expect(() => deleteProject(createState(), 'p1')).toThrow(ValidationError);
  });

  it('crea y borra una carpeta vacía', () => {
    const state = createState();
    const { project } = saveProject(state, { name: 'Nueva', description: '', color: '#10b981' }, ctx());
    expect(() => saveProject(state, { name: 'Mala', color: 'red' }, ctx())).toThrow(ValidationError);
    deleteProject(state, project.id);
    expect(state.projects).toHaveLength(1);
  });

  it('projectStats calcula el progreso', () => {
    const state = createState();
    toggleTask(state, 't1', ctx());
    expect(projectStats(state, 'p1')).toMatchObject({ total: 2, done: 1, open: 1, percent: 50 });
  });
});

describe('ajustes', () => {
  const valid = { name: 'Ana', secondTimezone: 'UTC', weeklyGoalHours: '20', workStart: '9', workEnd: '17', pomodoroMinutes: '50', notify: 'on' };

  it('guarda ajustes válidos convirtiendo tipos', () => {
    expect(updateSettings(createState(), valid)).toMatchObject({ workEnd: 17, pomodoroMinutes: 50, notify: true });
    expect(updateSettings(createState(), { ...valid, notify: '' }).notify).toBe(false);
  });

  it('rechaza una jornada que acaba antes de empezar o una zona desconocida', () => {
    expect(() => updateSettings(createState(), { ...valid, workEnd: '8' })).toThrow(ValidationError);
    expect(() => updateSettings(createState(), { ...valid, secondTimezone: 'Mars/Base' })).toThrow(ValidationError);
  });
});

describe('datos de muestra y series', () => {
  const data = createSampleData({ now: new Date(NOW), createId });

  it('son coherentes: todas las referencias a carpetas existen', () => {
    const ids = new Set(data.projects.map((p) => p.id));
    for (const item of [...data.tasks, ...data.events, ...data.logs]) expect(ids.has(item.projectId)).toBe(true);
    expect(data.events.some((e) => e.date === TODAY)).toBe(true);
  });

  it('las series del gráfico cuadran con el historial', () => {
    const days = dailyFocus(data, 20, new Date(NOW));
    expect(days).toHaveLength(20);
    expect(days.every((d) => d.values.length === data.projects.length)).toBe(true);
    const weeks = weeklyFocus(data, 12, new Date(NOW));
    expect(weeks).toHaveLength(12);
    const minutesThisWeek = weeks.at(-1)!.values.reduce((a, b) => a + b, 0);
    const expected = data.logs.filter((l) => l.date >= '2026-11-16' && l.date <= '2026-11-22').reduce((a, l) => a + l.minutes, 0);
    expect(minutesThisWeek).toBe(expected);
  });
});
