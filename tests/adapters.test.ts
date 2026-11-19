import { describe, expect, it } from 'vitest';
import { buildCalendarEvents, calendarResources, defaultsFromSlot, moveFromUpdate, parseCalendarId } from '../src/lib/calendarAdapter';
import { buildGantt, NO_PHASE_LABEL, rangeToISO, taskProgress } from '../src/lib/ganttAdapter';
import { parseISODate } from '../src/lib/dates';
import { taskRange } from '../src/store/selectors';
import { projectPhaseItems, parsePhaseValue, phaseValue } from '../src/components/forms/ProjectPhasePicker';
import { saveEvent, saveProject, saveTask, ValidationError } from '../src/store/mutations';
import { TODAY, createState, ctx } from './fixtures';

/** Estado con una carpeta con dos fases y tres tareas (con fase, sin fase y sin fecha). */
function stateWithPhases() {
  const state = createState();
  saveProject(state, { id: 'p1', name: 'Proyecto', description: '', color: '#3b82f6', phases: 'Diseño\nDesarrollo' }, ctx());
  const [design] = state.projects[0].phases;
  state.tasks[0].phaseId = design.id; // t1: due = hoy, 30 min
  state.tasks[1].due = '2026-11-19'; // t2: sin fase, 60 min
  saveTask(state, { title: 'Sin fecha', projectId: 'p1', priority: 'normal', estimateMin: '0', due: '' }, ctx());
  return state;
}

describe('gantt', () => {
  it('agrupa las tareas por fase, deja «Sin fase» para el resto y cuenta las que no tienen fecha', () => {
    const { resources, events, undated } = buildGantt(stateWithPhases(), 'p1');
    expect(resources.map((r) => r.title)).toEqual(['Diseño', NO_PHASE_LABEL]);
    expect(events.find((e) => e.id === 't1')?.resourceId).toBe(resources[0].id); // la tarea va en la fila de su fase
    expect(events.map((e) => e.id).sort()).toEqual(['t1', 't2']);
    expect(undated).toBe(1);
  });

  it('el fin de la barra es exclusivo: la fecha límite es su último día', () => {
    const { events } = buildGantt(stateWithPhases(), 'p1');
    const t1 = events.find((e) => e.id === 't1')!;
    expect(t1.start).toEqual(parseISODate(TODAY));
    expect(t1.end).toEqual(parseISODate('2026-11-18'));
    expect(t1.allDay).toBe(true);
    expect(t1.color).toBe('#3b82f6');
  });

  it('en la vista global cada carpeta es un grupo; sin fases lista sus tareas directamente', () => {
    const state = createState();
    const { resources, events } = buildGantt(state);
    expect(resources).toHaveLength(1);
    expect(resources[0]).toMatchObject({ id: 'project::p1', title: 'Proyecto' });
    expect(events.map((e) => e.id)).toEqual(['t1']); // t2 no tiene fecha
    expect(events[0].resourceId).toBe('p1::all');
  });

  it('rangeToISO convierte el fin exclusivo en el último día y no deja el fin antes del inicio', () => {
    expect(rangeToISO(parseISODate('2026-11-17'), parseISODate('2026-11-20'))).toEqual({ start: '2026-11-17', due: '2026-11-19' });
    expect(rangeToISO(new Date(2026, 10, 17, 9), new Date(2026, 10, 18, 13))).toEqual({ start: '2026-11-17', due: '2026-11-18' });
    expect(rangeToISO(parseISODate('2026-11-17'), parseISODate('2026-11-17'))).toEqual({ start: '2026-11-17', due: '2026-11-17' });
  });

  it('el avance es 100 al terminar y nunca llega a 100 antes', () => {
    const base = createState().tasks[0];
    expect(taskProgress({ ...base, status: 'done' })).toBe(100);
    expect(taskProgress({ ...base, estimateMin: 60, spentMin: 30 })).toBe(50);
    expect(taskProgress({ ...base, estimateMin: 60, spentMin: 600 })).toBe(99);
    expect(taskProgress({ ...base, estimateMin: 0, spentMin: 30 })).toBe(0);
  });
});

describe('calendario', () => {
  const stateWithEvent = () => {
    const state = createState();
    saveEvent(state, { title: 'Reunión', projectId: 'p1', kind: 'reunion', date: TODAY, start: '10:00', end: '11:30' }, ctx());
    return state;
  };

  it('pasa eventos con su hora y tareas abiertas como eventos de día completo de solo lectura', () => {
    const state = stateWithEvent();
    const events = buildCalendarEvents(state);
    const meeting = events.find((e) => e.id.startsWith('event:'))!;
    expect([meeting.start.getHours(), meeting.start.getMinutes(), meeting.end.getHours(), meeting.end.getMinutes()]).toEqual([10, 0, 11, 30]);
    expect(meeting.resourceId).toBe('p1');
    const task = events.find((e) => e.id === 'task:t1')!;
    expect(task).toMatchObject({ allDay: true, readOnly: true });
    expect(events.some((e) => e.id === 'task:t2')).toBe(false); // sin fecha
  });

  it('las carpetas son los recursos', () => {
    expect(calendarResources(createState())).toEqual([{ id: 'p1', title: 'Proyecto', color: '#3b82f6' }]);
  });

  it('reconoce de qué es cada id', () => {
    expect(parseCalendarId('event:abc')).toEqual({ kind: 'event', id: 'abc' });
    expect(parseCalendarId('task:t1')).toEqual({ kind: 'task', id: 't1' });
    expect(parseCalendarId('otro')).toBeNull();
  });

  it('un evento movido vuelve como fecha y horas; lo que no se puede representar, no', () => {
    const day = (h: number, m = 0, d = 18) => new Date(2026, 10, d, h, m);
    expect(moveFromUpdate({ event: { id: 'event:e1' }, start: day(9, 30), end: day(10, 45), allDay: false, resourceId: 'p2' })).toEqual({ id: 'e1', date: '2026-11-18', start: '09:30', end: '10:45', projectId: 'p2' });
    expect(moveFromUpdate({ event: { id: 'event:e1' }, start: day(22), end: day(0, 0, 19), allDay: false })?.end).toBe('23:59'); // acaba a medianoche
    expect(moveFromUpdate({ event: { id: 'event:e1' }, start: day(22), end: day(1, 0, 19), allDay: false })).toBeNull(); // cruza de día
    expect(moveFromUpdate({ event: { id: 'event:e1' }, start: day(0), end: day(0, 0, 19), allDay: true })).toBeNull();
    expect(moveFromUpdate({ event: { id: 'task:t1' }, start: day(9), end: day(10), allDay: false })).toBeNull();
  });

  it('un hueco marcado en el calendario da los valores del formulario de evento', () => {
    expect(defaultsFromSlot({ start: new Date(2026, 10, 18, 14), end: new Date(2026, 10, 18, 15), allDay: false, resourceId: 'p1' })).toEqual({ date: '2026-11-18', start: '14:00', end: '15:00', projectId: 'p1' });
    expect(defaultsFromSlot({ start: new Date(2026, 10, 18), end: new Date(2026, 10, 19), allDay: true })).toEqual({ date: '2026-11-18', projectId: undefined });
  });
});

describe('selector carpeta › fase', () => {
  it('una carpeta con fases ofrece «Sin fase» y sus fases; sin fases es una hoja', () => {
    const state = stateWithPhases();
    state.projects.push({ id: 'p2', name: 'Otra', color: '#10b981', description: '', members: [], phases: [] });
    const [withPhases, leaf] = projectPhaseItems(state.projects);
    expect(withPhases.children?.map((c) => c.label)).toEqual(['Sin fase', 'Diseño', 'Desarrollo']);
    expect(leaf.children).toBeUndefined();
  });

  it('el valor ida y vuelta: carpeta sola, o carpeta y fase', () => {
    const state = stateWithPhases();
    state.projects.push({ id: 'p2', name: 'Otra', color: '#10b981', description: '', members: [], phases: [] });
    const [design] = state.projects[0].phases;
    expect(parsePhaseValue(phaseValue('p1', design.id, state.projects))).toEqual({ projectId: 'p1', phaseId: design.id });
    expect(parsePhaseValue(phaseValue('p1', '', state.projects))).toEqual({ projectId: 'p1', phaseId: '' });
    expect(parsePhaseValue(phaseValue('p2', '', state.projects))).toEqual({ projectId: 'p2', phaseId: '' });
    expect(phaseValue('nope', '', state.projects)).toBe('');
  });
});

describe('hitos y dependencias en el gantt', () => {
  it('una tarea sin estimación es un hito: inicio y fin iguales', () => {
    const state = stateWithPhases();
    state.tasks[1].estimateMin = 0; // t2, con fecha de mañana
    state.tasks[1].due = '2026-11-20';
    const { events } = buildGantt(state, 'p1');
    const milestone = events.find((e) => e.id === 't2')!;
    expect(milestone.start.getTime()).toBe(milestone.end.getTime());
    expect(milestone.start).toEqual(parseISODate('2026-11-20'));
  });

  it('las dependencias se dibujan solo hacia tareas que también salen en el gantt', () => {
    const state = stateWithPhases();
    state.tasks[1].dependsOn = ['t1', 'fuera-del-gantt'];
    state.tasks[0].dependsOn = [];
    const { events } = buildGantt(state, 'p1');
    expect(events.find((e) => e.id === 't2')?.dependencies).toEqual(['t1']);
    expect(events.find((e) => e.id === 't1')?.dependencies).toBeUndefined();
  });

  it('taskRange de un hito es un solo día', () => {
    const state = createState();
    expect(taskRange(state, { ...state.tasks[0], estimateMin: 0, start: '', due: '2026-11-20' })).toEqual({ start: '2026-11-20', end: '2026-11-20' });
  });
});

const validTask = { title: 'Nueva', description: '', projectId: 'p1', priority: 'alta', estimateMin: '45', due: TODAY };

describe('varias tareas en una fila y dependencias', () => {
  it('todas las tareas de una fase comparten fila, aunque se solapen', () => {
    const state = createState();
    saveProject(state, { id: 'p1', name: 'Proyecto', description: '', color: '#3b82f6', phases: 'Diseño' }, ctx());
    state.tasks[0].phaseId = state.projects[0].phases[0].id;
    state.tasks[1].phaseId = state.projects[0].phases[0].id;
    state.tasks[1].due = TODAY; // mismo día que t1: se solapan
    const { resources, events } = buildGantt(state, 'p1');
    expect(resources).toHaveLength(1);
    expect(events.map((e) => e.resourceId)).toEqual([resources[0].id, resources[0].id]);
  });
});

describe('dependencias entre tareas', () => {
  it('guarda las predecesoras, ignora las que no existen y no deja ciclos', () => {
    const state = createState();
    saveTask(state, { id: 't1', ...validTask, dependsOn: ['t2', 'nope', 't1'] }, ctx());
    expect(state.tasks[0].dependsOn).toEqual(['t2']); // sin la propia tarea ni ids inexistentes
    expect(() => saveTask(state, { id: 't2', ...validTask, dependsOn: ['t1'] }, ctx())).toThrow(ValidationError); // t1 ya depende de t2
  });

  it('no admite predecesoras de otro proyecto', () => {
    const state = createState();
    saveProject(state, { name: 'Otra', description: '', color: '#10b981' }, ctx());
    state.tasks.push({ ...state.tasks[0], id: 'otra', projectId: state.projects[1].id, dependsOn: [] });
    saveTask(state, { id: 't1', ...validTask, dependsOn: ['otra', 't2'] }, ctx());
    expect(state.tasks.find((t) => t.id === 't1')?.dependsOn).toEqual(['t2']);
  });

  it('sin el campo, conserva las dependencias; con el campo vacío, las quita', () => {
    const state = createState();
    state.tasks[0].dependsOn = ['t2'];
    saveTask(state, { id: 't1', ...validTask }, ctx());
    expect(state.tasks[0].dependsOn).toEqual(['t2']);
    saveTask(state, { id: 't1', ...validTask, dependsOn: '' }, ctx());
    expect(state.tasks[0].dependsOn).toEqual([]);
  });
});
