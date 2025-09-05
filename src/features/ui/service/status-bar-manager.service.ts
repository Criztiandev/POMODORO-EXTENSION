import { PomodoroSession, PomodoroState, SessionType } from '@/types';
import * as vscode from 'vscode';


export class StatusBarManager {
  private mainStatusBarItem: vscode.StatusBarItem;
  private settingsButtonItem: vscode.StatusBarItem;

  constructor() {
    // Create two status bar items positioned together on the left for better visibility
    this.mainStatusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      101
    );
    this.settingsButtonItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );

    // Set commands
    this.mainStatusBarItem.command = 'pomodoro.toggleTimer';
    this.settingsButtonItem.command = 'pomodoro.openPanel';

    // Set button text and tooltip
    this.settingsButtonItem.text = '⚙️';
    this.settingsButtonItem.tooltip = 'Open Pomodoro panel';

    // Show all items
    this.mainStatusBarItem.show();
    this.settingsButtonItem.show();

    this.updateStatusBar({
      state: PomodoroState.IDLE,
      sessionType: SessionType.WORK,
      timeRemaining: 25 * 60 * 1000,
      totalTime: 25 * 60 * 1000,
      completedPomodoros: 0,
    });
  }

  updateStatusBar(session: PomodoroSession, currentTaskTitle?: string): void {
    const minutes = Math.floor(session.timeRemaining / 60000);
    const seconds = Math.floor((session.timeRemaining % 60000) / 1000);
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;

    let icon = '🍅';
    let sessionName = '';
    let tooltip = 'Click to start timer';

    switch (session.state) {
      case PomodoroState.WORK:
        icon = '🍅';
        sessionName = 'Working';
        tooltip = 'Working - Click to pause';
        break;
      case PomodoroState.SHORT_BREAK:
        icon = '☕';
        sessionName = 'Short Break';
        tooltip = 'Short break - Click to pause';
        break;
      case PomodoroState.LONG_BREAK:
        icon = '🛌';
        sessionName = 'Long Break';
        tooltip = 'Long break - Click to pause';
        break;
      case PomodoroState.PAUSED:
        icon = '⏸️';
        sessionName = 'Pause';
        tooltip = 'Paused - Click to resume';
        break;
      case PomodoroState.IDLE:
        icon = '▶️';
        sessionName = 'Start';
        tooltip = 'Click to start Pomodoro';
        break;
    }

    const taskInfo = currentTaskTitle || 'No task selected';
    const fullText = `${icon} ${sessionName} ${timeString} - ${taskInfo}`;
    this.mainStatusBarItem.text =
      fullText.length > 40 ? fullText.substring(0, 37) + '...' : fullText;
    this.mainStatusBarItem.tooltip = `${tooltip} | Completed: ${session.completedPomodoros}${currentTaskTitle ? ` | Task: ${currentTaskTitle}` : ''}`;
  }

  dispose(): void {
    this.mainStatusBarItem.dispose();
    this.settingsButtonItem.dispose();
  }
}
