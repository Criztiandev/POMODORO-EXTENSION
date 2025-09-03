import * as vscode from 'vscode';
import { PomodoroSession, PomodoroState } from '../types';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'pomodoro.start';
    this.statusBarItem.show();
    this.updateStatusBar({
      state: PomodoroState.IDLE,
      timeRemaining: 25 * 60 * 1000,
      totalTime: 25 * 60 * 1000,
      completedPomodoros: 0,
    });
  }

  updateStatusBar(session: PomodoroSession): void {
    const minutes = Math.floor(session.timeRemaining / 60000);
    const seconds = Math.floor((session.timeRemaining % 60000) / 1000);
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;

    let icon = '⏱️';
    let text = timeString;
    let tooltip = 'Pomodoro Timer - Click to start';

    switch (session.state) {
      case PomodoroState.WORK:
        icon = '🍅';
        tooltip = 'Working - Click to pause';
        this.statusBarItem.command = 'pomodoro.pause';
        break;
      case PomodoroState.SHORT_BREAK:
        icon = '☕';
        tooltip = 'Short break - Click to pause';
        this.statusBarItem.command = 'pomodoro.pause';
        break;
      case PomodoroState.LONG_BREAK:
        icon = '🛌';
        tooltip = 'Long break - Click to pause';
        this.statusBarItem.command = 'pomodoro.pause';
        break;
      case PomodoroState.PAUSED:
        icon = '⏸️';
        tooltip = 'Paused - Click to resume';
        this.statusBarItem.command = 'pomodoro.start';
        break;
      case PomodoroState.IDLE:
        icon = '⏱️';
        tooltip = 'Ready to start - Click to begin';
        this.statusBarItem.command = 'pomodoro.start';
        break;
    }

    this.statusBarItem.text = `${icon} ${text}`;
    this.statusBarItem.tooltip = `${tooltip} | Completed: ${session.completedPomodoros}`;
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
