import { createIdleTimer } from '../src/store/timer';
import type { AppState, MutationContext } from '../src/types';

export const TODAY = '2026-11-17';
export const NOW = new Date(2026, 10, 17, 10, 0).getTime();

let counter = 0;
export const createId = () => `id-${++counter}`;

export const ctx = (overrides: Partial<MutationContext> = {}): MutationContext => ({ now: NOW, today: TODAY, createId, ...overrides });

export function createState(): AppState {
  return {
    version: 5,
    settings: { name: 'Test', secondTimezone: 'UTC', workStart: 9, workEnd: 18, pomodoroMinutes: 25, weeklyGoalHours: 20, notify: false },
    projects: [{ id: 'p1', name: 'Proyecto', color: '#3b82f6', description: '', members: [], phases: [] }],
    tasks: [
      { id: 't1', title: 'Tarea 1', description: '', projectId: 'p1', phaseId: '', start: '', dependsOn: [], priority: 'normal', status: 'todo', estimateMin: 30, spentMin: 0, due: TODAY, doneAt: '' },
      { id: 't2', title: 'Tarea 2', description: '', projectId: 'p1', phaseId: '', start: '', dependsOn: [], priority: 'alta', status: 'todo', estimateMin: 60, spentMin: 10, due: '', doneAt: '' },
    ],
    events: [],
    logs: [],
    messages: [],
    docs: [],
    timer: createIdleTimer(),
  };
}
