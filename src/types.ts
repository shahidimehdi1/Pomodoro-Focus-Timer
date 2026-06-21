export interface TaskCycle {
  id: string;
  name: string;
  focusMinutes: number;
  breakMinutes: number;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  cycles: TaskCycle[];
}

export interface RoutineTask {
  id: string;
  name: string;
  focusMinutes: number;
  breakMinutes: number;
  completed: boolean;
}

export interface Routine {
  id: string;
  name: string;
  tasks: RoutineTask[];
}
