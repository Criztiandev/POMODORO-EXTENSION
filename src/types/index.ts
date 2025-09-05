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

export interface PomodoroSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  hourFormat: boolean; // true for 24h, false for 12h
  notificationEnabled: boolean;
}

export enum SessionType {
  WORK = 'work',
  SHORT_BREAK = 'shortBreak',
  LONG_BREAK = 'longBreak'
}
