export interface PomodoroSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  hourFormat: boolean; // true for 24h, false for 12h
  notificationEnabled: boolean;
  panelPosition: 'left' | 'right'; // status bar panel position
  notificationType: 'notification' | 'modal'; // notification display type
}