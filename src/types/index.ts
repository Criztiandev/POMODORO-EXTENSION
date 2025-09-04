export enum PomodoroState {
  IDLE = 'idle',
  WORK = 'work',
  SHORT_BREAK = 'shortBreak',
  LONG_BREAK = 'longBreak',
  PAUSED = 'paused',
}

export interface PomodoroSession {
  state: PomodoroState;
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
