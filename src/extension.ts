import * as vscode from 'vscode';
import { PomodoroTimer } from './timer/PomodoroTimer';
import { StatusBarManager } from './ui/StatusBarManager';
import { PomodoroSession } from './types';

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
  });

  pomodoroTimer.on('tick', (session: PomodoroSession) => {
    statusBarManager.updateStatusBar(session);
  });

  pomodoroTimer.on('sessionComplete', (session: PomodoroSession) => {
    const isBreak = session.state.includes('Break');
    const message = isBreak
      ? `Break time! Time to ${
          session.state === 'longBreak' ? 'take a long' : 'take a short'
        } break.`
      : 'Break is over! Time to get back to work.';

    vscode.window.showInformationMessage(message);
  });

  // Register commands
  const startCommand = vscode.commands.registerCommand('pomodoro.start', () => {
    pomodoroTimer.start();
  });

  const pauseCommand = vscode.commands.registerCommand('pomodoro.pause', () => {
    pomodoroTimer.pause();
  });

  const resetCommand = vscode.commands.registerCommand('pomodoro.reset', () => {
    pomodoroTimer.reset();
  });

  const skipCommand = vscode.commands.registerCommand('pomodoro.skip', () => {
    pomodoroTimer.skip();
  });

  // Add to context subscriptions
  context.subscriptions.push(
    startCommand,
    pauseCommand,
    resetCommand,
    skipCommand,
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
