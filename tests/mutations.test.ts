import { describe, expect, it } from 'vitest';
import {
  ValidationError,
  addMember,
  deleteDoc,
  deleteEvent,
  deleteMessage,
  deleteProject,
  deleteTask,
  moveTask,
  postMessage,
  removeMember,
  rescheduleEvent,
  restoreDoc,
  restoreEvent,
  restoreMember,
  restoreMessage,
  restoreProject,
  restoreTask,
  saveDoc,
  saveEvent,
  saveProject,
  saveTask,
  setTaskDates,
  toggleTask,
  updateSettings,
} from '../src/store/mutations';
import { authorOf, dailyFocus, daySlots, filterTasks, ganttBars, membersOf, projectStats, taskRange, weeklyFocus } from '../src/store/selectors';
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

describe('participantes, chat y documentos', () => {
  it('añade participantes sin repetir nombres y los quita (con deshacer)', () => {
    const state = createState();
    const member = addMember(state, 'p1', { name: 'Laura' }, ctx());
    expect(state.projects[0].members).toEqual([member]);
    expect(() => addMember(state, 'p1', { name: 'laura' }, ctx())).toThrow(ValidationError);
    expect(() => addMember(state, 'p1', { name: state.settings.name }, ctx())).toThrow(ValidationError);
    expect(() => addMember(state, 'p1', { name: '  ' }, ctx())).toThrow(ValidationError);
    const removed = removeMember(state, 'p1', member.id);
    expect(state.projects[0].members).toHaveLength(0);
    restoreMember(state, 'p1', removed.member, removed.index);
    expect(state.projects[0].members).toEqual([member]);
  });

  it('publica mensajes como el usuario o un participante, y valida el texto y el autor', () => {
    const state = createState();
    const member = addMember(state, 'p1', { name: 'Marc' }, ctx());
    expect(postMessage(state, 'p1', { text: ' Hola ' }, ctx())).toMatchObject({ text: 'Hola', authorId: 'me', projectId: 'p1' });
    expect(postMessage(state, 'p1', { text: 'Yo', authorId: member.id }, ctx()).authorId).toBe(member.id);
    expect(() => postMessage(state, 'p1', { text: '' }, ctx())).toThrow(ValidationError);
    expect(() => postMessage(state, 'p1', { text: 'x'.repeat(1001) }, ctx())).toThrow(ValidationError);
    expect(() => postMessage(state, 'p1', { text: 'a', authorId: 'nadie' }, ctx())).toThrow(ValidationError);
    expect(() => postMessage(state, 'nope', { text: 'a' }, ctx())).toThrow(ValidationError);
    const removed = deleteMessage(state, state.messages[0].id);
    expect(state.messages).toHaveLength(1);
    restoreMessage(state, removed.message, removed.index);
    expect(state.messages[0]).toEqual(removed.message);
  });

  it('crea y edita documentos y notas; el título es obligatorio', () => {
    const state = createState();
    const { doc, created } = saveDoc(state, 'p1', { kind: 'nota', title: 'Idea', body: 'Texto' }, ctx());
    expect(created).toBe(true);
    const edited = saveDoc(state, 'p1', { id: doc.id, kind: 'documento', title: 'Idea 2', body: '' }, ctx({ now: NOW + 1000 }));
    expect(edited.created).toBe(false);
    expect(state.docs).toHaveLength(1);
    expect(state.docs[0]).toMatchObject({ kind: 'documento', title: 'Idea 2', updatedAt: NOW + 1000 });
    expect(() => saveDoc(state, 'p1', { kind: 'nota', title: '' }, ctx())).toThrow(ValidationError);
    expect(() => saveDoc(state, 'p1', { kind: 'otro', title: 'x' }, ctx())).toThrow(ValidationError);
    const removed = deleteDoc(state, doc.id);
    expect(state.docs).toHaveLength(0);
    restoreDoc(state, removed.doc, removed.index);
    expect(state.docs).toHaveLength(1);
  });

  it('al borrar una carpeta se llevan su chat y documentos, y deshacer los devuelve', () => {
    const state = createState();
    const { project } = saveProject(state, { name: 'Nueva', description: '', color: '#10b981' }, ctx());
    postMessage(state, project.id, { text: 'hola' }, ctx());
    saveDoc(state, project.id, { kind: 'nota', title: 'n' }, ctx());
    postMessage(state, 'p1', { text: 'de otra carpeta' }, ctx());
    const removed = deleteProject(state, project.id);
    expect(state.messages.map((m) => m.projectId)).toEqual(['p1']);
    expect(state.docs).toHaveLength(0);
    restoreProject(state, removed);
    expect(state.projects.some((p) => p.id === project.id)).toBe(true);
    expect(state.messages).toHaveLength(2);
    expect(state.docs).toHaveLength(1);
  });

  it('los selectores devuelven al usuario primero y firman «Ex participante» a quien se fue', () => {
    const state = createState();
    const member = addMember(state, 'p1', { name: 'Marc' }, ctx());
    expect(membersOf(state, 'p1').map((m) => m.id)).toEqual(['me', member.id]);
    removeMember(state, 'p1', member.id);
    expect(authorOf(state, 'p1', member.id).name).toBe('Ex participante');
    expect(authorOf(state, 'p1', 'me').name).toBe('Test');
  });
});

describe('fases e inicio de tareas', () => {
  /** Carpeta con dos fases. */
  const withPhases = () => {
    const state = createState();
    saveProject(state, { id: 'p1', name: 'Proyecto', description: '', color: '#3b82f6', phases: 'Diseño\nDesarrollo' }, ctx());
    return state;
  };

  it('saveProject crea fases a partir de líneas, sin vacías ni repetidas, y conserva el id de las que siguen', () => {
    const state = withPhases();
    const [design, build] = state.projects[0].phases;
    expect([design.name, build.name]).toEqual(['Diseño', 'Desarrollo']);
    saveProject(state, { id: 'p1', name: 'Proyecto', description: '', color: '#3b82f6', phases: 'desarrollo\n\n Diseño \nDiseño\nRevisión' }, ctx());
    expect(state.projects[0].phases.map((f) => f.name)).toEqual(['desarrollo', 'Diseño', 'Revisión']);
    expect(state.projects[0].phases[0].id).toBe(build.id);
    expect(state.projects[0].phases[1].id).toBe(design.id);
  });

  it('saveProject valida las fases y, sin el campo, las conserva', () => {
    const state = withPhases();
    const base = { id: 'p1', name: 'Proyecto', description: '', color: '#3b82f6' };
    expect(() => saveProject(state, { ...base, phases: 'x'.repeat(31) }, ctx())).toThrow(ValidationError);
    expect(() => saveProject(state, { ...base, phases: Array.from({ length: 13 }, (_, i) => `F${i}`).join('\n') }, ctx())).toThrow(ValidationError);
    saveProject(state, base, ctx());
    expect(state.projects[0].phases).toHaveLength(2);
  });

  it('quitar una fase deja sus tareas sin fase', () => {
    const state = withPhases();
    const [design, build] = state.projects[0].phases;
    saveTask(state, { id: 't1', ...validTask, phaseId: design.id }, ctx());
    saveTask(state, { id: 't2', ...validTask, phaseId: build.id }, ctx());
    saveProject(state, { id: 'p1', name: 'Proyecto', description: '', color: '#3b82f6', phases: 'Desarrollo' }, ctx());
    expect(state.tasks.find((t) => t.id === 't1')?.phaseId).toBe('');
    expect(state.tasks.find((t) => t.id === 't2')?.phaseId).toBe(build.id);
  });

  it('saveTask guarda la fase y rechaza una que no es de la carpeta; sin el campo la conserva', () => {
    const state = withPhases();
    const [design] = state.projects[0].phases;
    const { task } = saveTask(state, validTask, ctx());
    expect(task.phaseId).toBe('');
    saveTask(state, { id: task.id, ...validTask, phaseId: design.id }, ctx());
    expect(state.tasks.find((t) => t.id === task.id)?.phaseId).toBe(design.id);
    expect(() => saveTask(state, { id: task.id, ...validTask, phaseId: 'otra' }, ctx())).toThrow(ValidationError);
    saveTask(state, { id: task.id, ...validTask }, ctx()); // un formulario sin el campo no la borra
    expect(state.tasks.find((t) => t.id === task.id)?.phaseId).toBe(design.id);
  });

  it('al pasar la tarea a otra carpeta sin indicar fase, se limpia', () => {
    const state = withPhases();
    const { project } = saveProject(state, { name: 'Otra', description: '', color: '#10b981' }, ctx());
    const { task } = saveTask(state, { ...validTask, phaseId: state.projects[0].phases[0].id }, ctx());
    saveTask(state, { id: task.id, ...validTask, projectId: project.id }, ctx());
    expect(state.tasks.find((t) => t.id === task.id)?.phaseId).toBe('');
  });

  it('el inicio no puede ser posterior a la fecha límite; sin el campo se conserva', () => {
    const state = createState();
    expect(() => saveTask(state, { ...validTask, start: '2026-12-01', due: '2026-11-20' }, ctx())).toThrow(ValidationError);
    const { task } = saveTask(state, { ...validTask, start: '2026-11-10', due: '2026-11-20' }, ctx());
    expect(task.start).toBe('2026-11-10');
    saveTask(state, { id: task.id, ...validTask, due: '2026-11-25' }, ctx());
    expect(state.tasks.find((t) => t.id === task.id)?.start).toBe('2026-11-10');
  });

  it('setTaskDates cambia inicio y fecha límite, y valida', () => {
    const state = createState();
    setTaskDates(state, 't1', { start: '2026-11-18', due: '2026-11-20' });
    expect(state.tasks[0]).toMatchObject({ start: '2026-11-18', due: '2026-11-20' });
    expect(() => setTaskDates(state, 't1', { start: '2026-11-21', due: '2026-11-20' })).toThrow(ValidationError);
    expect(() => setTaskDates(state, 't1', { start: '', due: '' })).toThrow(ValidationError);
    expect(() => setTaskDates(state, 'nope', { start: '', due: '2026-11-20' })).toThrow(ValidationError);
  });

  it('taskRange usa el inicio si lo hay y, si no, la estimación en jornadas terminando en la fecha límite', () => {
    const state = createState(); // jornada 9-18 = 540 min
    expect(taskRange(state, { ...state.tasks[0], due: '2026-11-17', estimateMin: 30 })).toEqual({ start: '2026-11-17', end: '2026-11-17' });
    expect(taskRange(state, { ...state.tasks[0], due: '2026-11-17', estimateMin: 1100 })).toEqual({ start: '2026-11-15', end: '2026-11-17' });
    expect(taskRange(state, { ...state.tasks[0], due: '2026-11-17', start: '2026-11-10' })).toEqual({ start: '2026-11-10', end: '2026-11-17' });
    expect(taskRange(state, { ...state.tasks[0], due: '' })).toBeNull();
  });
});

describe('reprogramar eventos', () => {
  it('mueve un evento de día y hora, y cambia de carpeta si se indica', () => {
    const state = createState();
    const { event } = saveEvent(state, { title: 'R', projectId: 'p1', kind: 'reunion', date: TODAY, start: '10:00', end: '11:00' }, ctx());
    rescheduleEvent(state, event.id, { date: '2026-11-18', start: '09:30', end: '10:15' });
    expect(state.events[0]).toMatchObject({ date: '2026-11-18', start: '09:30', end: '10:15', projectId: 'p1' });
    expect(() => rescheduleEvent(state, event.id, { date: '2026-11-18', start: '11:00', end: '10:00' })).toThrow(ValidationError);
    expect(() => rescheduleEvent(state, event.id, { date: 'ayer', start: '09:00', end: '10:00' })).toThrow(ValidationError);
    expect(() => rescheduleEvent(state, event.id, { date: TODAY, start: '09:00', end: '10:00', projectId: 'nope' })).toThrow(ValidationError);
    expect(() => rescheduleEvent(state, 'nope', { date: TODAY, start: '09:00', end: '10:00' })).toThrow(ValidationError);
  });
});
