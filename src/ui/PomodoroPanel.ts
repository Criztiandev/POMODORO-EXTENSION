import * as vscode from 'vscode';
import * as ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import { PomodoroSession, PomodoroState, SessionType } from '../types';
import { SettingsManager } from '../settings/SettingsManager';

export class PomodoroPanel {
  public static currentPanel: PomodoroPanel | undefined;
  public static readonly viewType = 'pomodoroPanel';

  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private currentSession: PomodoroSession | null = null;
  private isSettingsView: boolean = false;
  private readonly extensionUri: vscode.Uri;

  private getTemplatePath(templateName: string): string {
    return path.join(this.extensionUri.fsPath, 'src', 'templates', `${templateName}.ejs`);
  }

  public static createOrShow(extensionUri: vscode.Uri): PomodoroPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (PomodoroPanel.currentPanel) {
      PomodoroPanel.currentPanel.panel.reveal(column);
      return PomodoroPanel.currentPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      PomodoroPanel.viewType,
      'Pomodoro Timer',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    PomodoroPanel.currentPanel = new PomodoroPanel(panel, extensionUri);
    return PomodoroPanel.currentPanel;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.update();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    
    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'toggleTimer':
            vscode.commands.executeCommand('pomodoro.toggleTimer');
            break;
          case 'skip':
            vscode.commands.executeCommand('pomodoro.skip');
            break;
          case 'switchSession':
            vscode.commands.executeCommand('pomodoro.switchSession', message.sessionType);
            break;
          case 'showSettings':
            this.isSettingsView = true;
            this.update();
            break;
          case 'showDashboard':
            this.isSettingsView = false;
            this.update();
            break;
          case 'updateSettings':
            this.handleSettingsUpdate(message.settings);
            break;
        }
      },
      null,
      this.disposables
    );
  }

  private async handleSettingsUpdate(settings: any): Promise<void> {
    try {
      // Check if timer is active before allowing settings update
      const isTimerActive = await vscode.commands.executeCommand('pomodoro.isTimerActive');
      
      if (isTimerActive) {
        vscode.window.showWarningMessage('Cannot change settings while timer is running!');
        return;
      }

      await SettingsManager.updateSettings(settings);
      vscode.commands.executeCommand('pomodoro.updateSettings');
      vscode.window.showInformationMessage('Settings updated successfully!');
    } catch (error) {
      vscode.window.showErrorMessage('Failed to update settings');
    }
  }

  public updateSession(session: PomodoroSession): void {
    this.currentSession = session;
    this.update();
    
    // Send session data to webview for real-time updates
    if (this.panel.webview && !this.isSettingsView) {
      this.panel.webview.postMessage({
        command: 'updateSession',
        session: session,
        isTimerActive: session.state !== PomodoroState.IDLE && session.state !== PomodoroState.PAUSED
      });
    }
  }

  public dispose(): void {
    PomodoroPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private update(): void {
    const webview = this.panel.webview;
    this.panel.title = this.isSettingsView ? 'Pomodoro Settings' : 'Pomodoro Timer';
    this.panel.webview.html = this.getHtmlForWebview(webview);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    try {
      if (this.isSettingsView) {
        return this.renderSettingsTemplate();
      } else {
        return this.renderDashboardTemplate();
      }
    } catch (error) {
      console.error('Error rendering template:', error);
      return this.getErrorHtml(error);
    }
  }

  private renderDashboardTemplate(): string {
    const session = this.currentSession || {
      state: PomodoroState.IDLE,
      sessionType: SessionType.WORK,
      timeRemaining: 25 * 60 * 1000,
      totalTime: 25 * 60 * 1000,
      completedPomodoros: 0,
    };

    const minutes = Math.floor(session.timeRemaining / 60000);
    const seconds = Math.floor((session.timeRemaining % 60000) / 1000);
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const isTimerActive = session.state !== PomodoroState.IDLE && session.state !== PomodoroState.PAUSED;
    let buttonText = 'Start';
    
    if (session.state === 'idle') {
      buttonText = 'Start';
    } else if (isTimerActive) {
      buttonText = 'Pause';
    } else if (session.state === 'paused') {
      buttonText = 'Start'; // Always show Start after skip/pause for better UX
    }

    const templatePath = this.getTemplatePath('dashboard');
    const template = fs.readFileSync(templatePath, 'utf8');
    
    return ejs.render(template, {
      timeString,
      sessionType: session.sessionType,
      buttonText,
      isTimerActive,
      completedPomodoros: session.completedPomodoros
    });
  }

  private renderSettingsTemplate(): string {
    const settings = SettingsManager.getSettings();
    const isTimerActive = this.currentSession?.state !== PomodoroState.IDLE && 
                         this.currentSession?.state !== PomodoroState.PAUSED;

    const templatePath = this.getTemplatePath('settings');
    const template = fs.readFileSync(templatePath, 'utf8');
    
    return ejs.render(template, {
      settings,
      isTimerActive
    });
  }

  private getErrorHtml(error: any): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Template Error</title>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            color: var(--vscode-foreground); 
            background: var(--vscode-editor-background);
            padding: 20px;
        }
        .error { 
            color: var(--vscode-errorForeground); 
            background: var(--vscode-inputValidation-errorBackground);
            padding: 10px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <h1>Template Rendering Error</h1>
    <div class="error">
        <pre>${error.message || error}</pre>
    </div>
</body>
</html>`;
  }
}