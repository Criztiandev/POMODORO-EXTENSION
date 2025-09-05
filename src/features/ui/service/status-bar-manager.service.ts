import { PomodoroSession, PomodoroState, SessionType } from '@/types';
import { SettingsManager } from '@/features/settings/service/settings-manager.service';
import * as vscode from 'vscode';

export class StatusBarManager {
  private mainStatusBarItem: vscode.StatusBarItem;
  private settingsButtonItem: vscode.StatusBarItem;

  constructor() {
    const settings = SettingsManager.getSettings();
    const alignment =
      settings.panelPosition === 'right'
        ? vscode.StatusBarAlignment.Right
        : vscode.StatusBarAlignment.Left;

    // Create two status bar items positioned together based on settings
    this.mainStatusBarItem = vscode.window.createStatusBarItem(alignment, 101);
    this.settingsButtonItem = vscode.window.createStatusBarItem(alignment, 100);

    // Set commands
    this.mainStatusBarItem.command = 'pomodoro.toggleTimer';
    this.settingsButtonItem.command = 'pomodoro.openPanel';

    // Set button text and tooltip (using Lucide-style Unicode icon as fallback)
    this.settingsButtonItem.text = '⚙';
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

    let icon = '○';
    let sessionName = '';
    let tooltip = 'Click to start timer';

    switch (session.state) {
      case PomodoroState.WORK:
        icon = '🕛'; // Timer icon representation
        sessionName = 'Working';
        tooltip = 'Working - Click to pause';
        break;
      case PomodoroState.SHORT_BREAK:
        icon = '☕'; // Keep coffee icon for breaks
        sessionName = 'Short Break';
        tooltip = 'Short break - Click to pause';
        break;
      case PomodoroState.LONG_BREAK:
        icon = '☕'; // Keep coffee icon for breaks
        sessionName = 'Long Break';
        tooltip = 'Long break - Click to pause';
        break;
      case PomodoroState.PAUSED:
        icon = '⏸️'; // Simplified pause
        sessionName = 'Pause';
        tooltip = 'Paused - Click to resume';
        break;
      case PomodoroState.IDLE:
        icon = '🍅'; // Simplified play
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

  updatePosition(): void {
    const settings = SettingsManager.getSettings();
    const alignment =
      settings.panelPosition === 'right'
        ? vscode.StatusBarAlignment.Right
        : vscode.StatusBarAlignment.Left;

    // Dispose old items
    this.mainStatusBarItem.dispose();
    this.settingsButtonItem.dispose();

    // Create new items with updated position
    this.mainStatusBarItem = vscode.window.createStatusBarItem(alignment, 101);
    this.settingsButtonItem = vscode.window.createStatusBarItem(alignment, 100);

    // Re-configure commands and display
    this.mainStatusBarItem.command = 'pomodoro.toggleTimer';
    this.settingsButtonItem.command = 'pomodoro.openPanel';
    this.settingsButtonItem.text = '⚙';
    this.settingsButtonItem.tooltip = 'Open Pomodoro panel';

    // Show items
    this.mainStatusBarItem.show();
    this.settingsButtonItem.show();
  }

  dispose(): void {
    this.mainStatusBarItem.dispose();
    this.settingsButtonItem.dispose();
  }
}
