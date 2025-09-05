export enum PomodoroState {
  IDLE = 'idle',
  WORK = 'work',
  SHORT_BREAK = 'shortBreak',
  LONG_BREAK = 'longBreak',
  PAUSED = 'paused',
}

export interface PomodoroSession {
  state: PomodoroState;
  sessionType: SessionType;
  timeRemaining: number;
  totalTime: number;
  completedPomodoros: number;
}

export interface PomodoroConfig {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  pomodorosBeforeLongBreak: number;
}



export enum SessionType {
  WORK = 'work',
  SHORT_BREAK = 'shortBreak',
  LONG_BREAK = 'longBreak'
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  estimatedPomodoros?: number;
  estimatedMinutes?: number;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
  priority?: 'low' | 'medium' | 'high';
}

export interface TodoState {
  tasks: Todo[];
  currentTaskId?: string;
}
