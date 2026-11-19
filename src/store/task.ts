import type { Task, TaskStatus } from '../types';

/** Único punto que cambia el estado de una tarea, para mantener `doneAt` coherente. */
export function setTaskStatus(task: Task, status: TaskStatus, today: string) {
  task.status = status;
  task.doneAt = status === 'done' ? today : '';
}
