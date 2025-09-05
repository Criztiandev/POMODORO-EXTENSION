export interface PomodoroSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  hourFormat: boolean; // true for 24h, false for 12h
  notificationEnabled: boolean;
}