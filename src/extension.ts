import * as vscode from 'vscode';
import { PomodoroTimer } from './timer/PomodoroTimer';
import { StatusBarManager } from './ui/StatusBarManager';
import { PomodoroPanel } from './ui/PomodoroPanel';
import { PomodoroSession, PomodoroState } from './types';
import { SettingsManager } from './settings/SettingsManager';

let pomodoroTimer: PomodoroTimer;
let statusBarManager: StatusBarManager;

export function activate(context: vscode.ExtensionContext) {
  console.log('Pomodoro extension is now active!');

  // Initialize components
  pomodoroTimer = new PomodoroTimer();
  statusBarManager = new StatusBarManager();

  // Set up event listeners
  pomodoroTimer.on('stateChanged', (session: PomodoroSession) => {
    statusBarManager.updateStatusBar(session);
    // Update panel if it's open
    if (PomodoroPanel.currentPanel) {
      PomodoroPanel.currentPanel.updateSession(session);
    }
  });

  pomodoroTimer.on('tick', (session: PomodoroSession) => {
    statusBarManager.updateStatusBar(session);
    // Update panel if it's open
    if (PomodoroPanel.currentPanel) {
      PomodoroPanel.currentPanel.updateSession(session);
    }
  });

  pomodoroTimer.on('sessionComplete', (session: PomodoroSession) => {
    const settings = SettingsManager.getSettings();
    
    if (!settings.notificationEnabled) {
      // Update panel if it's open
      if (PomodoroPanel.currentPanel) {
        PomodoroPanel.currentPanel.updateSession(session);
      }
      return;
    }

    let message = '';
    let nextState = '';
    
    // Determine what session just completed and what's next
    if (session.state === PomodoroState.PAUSED) {
      // We need to look at what would be next based on current cycle
      if (session.completedPomodoros === 0) {
        message = 'Ready to start your first Pomodoro session!';
        nextState = 'Work Session';
      } else {
        const cyclePos = session.completedPomodoros % 6;
        if (cyclePos === 1 || cyclePos === 3) {
          message = '🍅 Work session completed! Time for a short break.';
          nextState = 'Short Break';
        } else if (cyclePos === 5) {
          message = '🍅 Work session completed! Time for a long break.';
          nextState = 'Long Break';
        } else if (cyclePos === 0 || cyclePos === 2 || cyclePos === 4) {
          message = '☕ Break time over! Ready for another work session.';
          nextState = 'Work Session';
        }
      }
    }

    // Show multiple notifications based on settings
    for (let i = 0; i < settings.notificationCount; i++) {
      setTimeout(() => {
        vscode.window.showInformationMessage(
          `${message} Click to start ${nextState}`,
          'Start Session'
        ).then(selection => {
          if (selection === 'Start Session') {
            vscode.commands.executeCommand('pomodoro.start');
          }
        });
      }, i * 1000); // Stagger notifications by 1 second
    }

    // Update panel if it's open
    if (PomodoroPanel.currentPanel) {
      PomodoroPanel.currentPanel.updateSession(session);
    }
  });

  pomodoroTimer.on('sessionSkipped', (session: PomodoroSession) => {
    // Simple feedback for skip action - no multiple notifications
    vscode.window.showInformationMessage('⏭️ Session skipped! Ready for next session.');
    
    // Update panel if it's open
    if (PomodoroPanel.currentPanel) {
      PomodoroPanel.currentPanel.updateSession(session);
    }
  });

  // Register commands
  const startCommand = vscode.commands.registerCommand('pomodoro.start', () => {
    const session = pomodoroTimer.getSession();
    if (
      session.state === PomodoroState.PAUSED ||
      session.state === PomodoroState.IDLE
    ) {
      pomodoroTimer.start();
    } else {
      pomodoroTimer.pause();
    }
  });

  const pauseCommand = vscode.commands.registerCommand('pomodoro.pause', () => {
    pomodoroTimer.pause();
  });

  const resetCommand = vscode.commands.registerCommand('pomodoro.reset', () => {
    pomodoroTimer.reset();
  });

  const skipCommand = vscode.commands.registerCommand('pomodoro.skip', () => {
    if (!pomodoroTimer.isTimerActive()) {
      vscode.window.showWarningMessage('⚠️ Cannot skip - timer is not running. Start the timer first.');
      return;
    }
    pomodoroTimer.skip();
  });

  const openPanelCommand = vscode.commands.registerCommand(
    'pomodoro.openPanel',
    () => {
      const panel = PomodoroPanel.createOrShow(context.extensionUri);
      panel.updateSession(pomodoroTimer.getSession());
    }
  );

  const toggleTimerCommand = vscode.commands.registerCommand(
    'pomodoro.toggleTimer',
    () => {
      const session = pomodoroTimer.getSession();
      if (
        session.state === PomodoroState.PAUSED ||
        session.state === PomodoroState.IDLE
      ) {
        pomodoroTimer.start();
      } else {
        pomodoroTimer.pause();
      }
    }
  );

  const updateSettingsCommand = vscode.commands.registerCommand(
    'pomodoro.updateSettings',
    () => {
      pomodoroTimer.updateSettings();
    }
  );

  const isTimerActiveCommand = vscode.commands.registerCommand(
    'pomodoro.isTimerActive',
    () => {
      return pomodoroTimer.isTimerActive();
    }
  );

  const switchSessionCommand = vscode.commands.registerCommand(
    'pomodoro.switchSession',
    (sessionType: 'work' | 'shortBreak' | 'longBreak') => {
      pomodoroTimer.switchToSession(sessionType);
    }
  );

  // Add to context subscriptions
  context.subscriptions.push(
    startCommand,
    pauseCommand,
    resetCommand,
    skipCommand,
    openPanelCommand,
    toggleTimerCommand,
    updateSettingsCommand,
    isTimerActiveCommand,
    switchSessionCommand,
    statusBarManager
  );
}

export function deactivate() {
  if (pomodoroTimer) {
    pomodoroTimer.removeAllListeners();
  }
  if (statusBarManager) {
    statusBarManager.dispose();
  }
}
