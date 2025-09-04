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

  private getDashboardHtml(): string {
    const session = this.currentSession || {
      state: PomodoroState.IDLE,
      timeRemaining: 25 * 60 * 1000,
      totalTime: 25 * 60 * 1000,
      completedPomodoros: 0,
    };

    const minutes = Math.floor(session.timeRemaining / 60000);
    const seconds = Math.floor((session.timeRemaining % 60000) / 1000);
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const isActive = session.state !== PomodoroState.IDLE && session.state !== PomodoroState.PAUSED;
    const buttonText = session.state === PomodoroState.IDLE ? 'Start' : 
                      isActive ? 'Pause' : 'Resume';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pomodoro Timer</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
            text-align: center;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }
        h1 {
            color: var(--vscode-titleBar-activeForeground);
            margin: 0;
        }
        .settings-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        }
        .settings-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .timer-display {
            font-size: 4rem;
            font-weight: bold;
            margin: 40px 0;
            color: var(--vscode-foreground);
        }
        .tabs {
            display: flex;
            justify-content: center;
            margin: 30px 0;
            border-bottom: 2px solid var(--vscode-panel-border);
        }
        .tab {
            background: none;
            border: none;
            padding: 12px 24px;
            cursor: pointer;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }
        .tab.active {
            color: var(--vscode-foreground);
            border-bottom-color: var(--vscode-focusBorder);
        }
        .tab:hover {
            color: var(--vscode-foreground);
        }
        .controls {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-top: 40px;
        }
        .control-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            min-width: 100px;
        }
        .control-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .control-btn.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .control-btn.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .control-btn.disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .control-btn.disabled:hover {
            background: var(--vscode-button-secondaryBackground);
        }
        .session-info {
            margin-top: 20px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍅 Pomodoro Timer</h1>
            <button class="settings-btn" onclick="showSettings()">⚙️ Settings</button>
        </div>
        
        <div class="timer-display">${timeString}</div>
        
        <div class="tabs">
            <button class="tab ${session.state === PomodoroState.WORK || session.state === PomodoroState.IDLE ? 'active' : ''}" onclick="selectTab('work')">
                🍅 Working
            </button>
            <button class="tab ${session.state === PomodoroState.SHORT_BREAK ? 'active' : ''}" onclick="selectTab('shortBreak')">
                ☕ Short Break
            </button>
            <button class="tab ${session.state === PomodoroState.LONG_BREAK ? 'active' : ''}" onclick="selectTab('longBreak')">
                🛌 Long Break
            </button>
        </div>
        
        <div class="controls">
            <button class="control-btn" onclick="toggleTimer()">${buttonText}</button>
            <button class="control-btn secondary ${isActive ? '' : 'disabled'}" onclick="skip()" ${isActive ? '' : 'disabled'}>Skip</button>
        </div>
        
        <div class="session-info">
            Completed Pomodoros: ${session.completedPomodoros}
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function toggleTimer() {
            vscode.postMessage({ command: 'toggleTimer' });
        }
        
        function skip() {
            vscode.postMessage({ command: 'skip' });
        }
        
        function showSettings() {
            vscode.postMessage({ command: 'showSettings' });
        }
        
        function selectTab(type) {
            vscode.postMessage({ 
                command: 'switchSession', 
                sessionType: type 
            });
        }
        
        function formatTime(milliseconds) {
            const minutes = Math.floor(milliseconds / 60000);
            const seconds = Math.floor((milliseconds % 60000) / 1000);
            return minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
        }
        
        function updateUI(session, isTimerActive = false) {
            // Update timer display
            const timerDisplay = document.querySelector('.timer-display');
            if (timerDisplay) {
                timerDisplay.textContent = formatTime(session.timeRemaining);
            }
            
            // Update tabs active state
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            if (session.state === 'work' || session.state === 'idle') {
                document.querySelector('.tab:nth-child(1)').classList.add('active');
            } else if (session.state === 'shortBreak') {
                document.querySelector('.tab:nth-child(2)').classList.add('active');
            } else if (session.state === 'longBreak') {
                document.querySelector('.tab:nth-child(3)').classList.add('active');
            }
            
            // Update button text
            const controlBtn = document.querySelector('.control-btn');
            if (controlBtn) {
                const buttonText = session.state === 'idle' ? 'Start' : 
                                  isTimerActive ? 'Pause' : 'Resume';
                controlBtn.textContent = buttonText;
            }
            
            // Update skip button state
            const skipBtn = document.querySelector('.control-btn.secondary');
            if (skipBtn) {
                if (isTimerActive) {
                    skipBtn.classList.remove('disabled');
                    skipBtn.removeAttribute('disabled');
                } else {
                    skipBtn.classList.add('disabled');
                    skipBtn.setAttribute('disabled', 'true');
                }
            }
            
            // Update session info
            const sessionInfo = document.querySelector('.session-info');
            if (sessionInfo) {
                sessionInfo.textContent = 'Completed Pomodoros: ' + session.completedPomodoros;
            }
        }
        
        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'updateSession') {
                updateUI(message.session, message.isTimerActive);
            }
        });
    </script>
</body>
</html>`;
  }

  private getSettingsHtml(): string {
    const settings = SettingsManager.getSettings();
    const isTimerActive = this.currentSession?.state !== PomodoroState.IDLE && 
                         this.currentSession?.state !== PomodoroState.PAUSED;
    const disabledAttr = isTimerActive ? 'disabled' : '';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pomodoro Settings</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 500px;
            margin: 0 auto;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }
        h1 {
            color: var(--vscode-titleBar-activeForeground);
            margin: 0;
        }
        .back-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        }
        .back-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .setting-group {
            margin-bottom: 24px;
        }
        .setting-label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
        }
        .setting-input {
            width: 100%;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 8px 12px;
            font-size: 14px;
            box-sizing: border-box;
        }
        .setting-input:focus {
            border-color: var(--vscode-focusBorder);
            outline: none;
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .checkbox {
            width: auto;
            margin: 0;
        }
        .range-group {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .range-input {
            flex: 1;
        }
        .range-value {
            min-width: 40px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
        }
        .save-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
            margin-top: 20px;
        }
        .save-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .description {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            margin-top: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚙️ Pomodoro Settings</h1>
            <button class="back-btn" onclick="showDashboard()">← Dashboard</button>
        </div>
        
        ${isTimerActive ? '<div style="padding: 12px; background: var(--vscode-inputValidation-warningBackground); color: var(--vscode-inputValidation-warningForeground); border-radius: 4px; margin-bottom: 20px;">⚠️ Settings cannot be changed while timer is running. Stop the timer to modify settings.</div>' : ''}
        
        <form id="settingsForm">
            <div class="setting-group">
                <label class="setting-label" for="workDuration">Pomodoro Duration (minutes)</label>
                <input type="number" id="workDuration" class="setting-input" value="${settings.workDuration}" min="1" max="60" ${disabledAttr}>
            </div>
            
            <div class="setting-group">
                <label class="setting-label" for="shortBreakDuration">Short Break Duration (minutes)</label>
                <input type="number" id="shortBreakDuration" class="setting-input" value="${settings.shortBreakDuration}" min="1" max="30" ${disabledAttr}>
            </div>
            
            <div class="setting-group">
                <label class="setting-label" for="longBreakDuration">Long Break Duration (minutes)</label>
                <input type="number" id="longBreakDuration" class="setting-input" value="${settings.longBreakDuration}" min="1" max="60" ${disabledAttr}>
            </div>
            
            <div class="setting-group">
                <label class="setting-label">Hour Format</label>
                <div class="checkbox-group">
                    <input type="checkbox" id="hourFormat" class="checkbox" ${settings.hourFormat ? 'checked' : ''} ${disabledAttr}>
                    <label for="hourFormat">Use 24-hour format</label>
                </div>
                <div class="description">Currently using MM:SS format for timer display</div>
            </div>
            
            <div class="setting-group">
                <label class="setting-label">Notification</label>
                <div class="checkbox-group">
                    <input type="checkbox" id="notificationEnabled" class="checkbox" ${settings.notificationEnabled ? 'checked' : ''} ${disabledAttr}>
                    <label for="notificationEnabled">Enable notifications</label>
                </div>
            </div>
            
            <div class="setting-group">
                <label class="setting-label" for="notificationCount">Notification Count</label>
                <input type="number" id="notificationCount" class="setting-input" value="${settings.notificationCount}" min="1" max="10" ${disabledAttr}>
                <div class="description">Number of notifications to show</div>
            </div>
            
            <div class="setting-group">
                <label class="setting-label">Alarm Volume</label>
                <div class="range-group">
                    <input type="range" id="alarmVolume" class="range-input" value="${settings.alarmVolume}" min="0" max="100" ${disabledAttr}>
                    <span class="range-value" id="volumeValue">${settings.alarmVolume}%</span>
                </div>
            </div>
            
            <button type="submit" class="save-btn" ${disabledAttr}>${isTimerActive ? 'Timer Running - Stop to Save' : 'Save Settings'}</button>
        </form>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        // Update volume display
        document.getElementById('alarmVolume').addEventListener('input', function(e) {
            document.getElementById('volumeValue').textContent = e.target.value + '%';
        });
        
        function showDashboard() {
            vscode.postMessage({ command: 'showDashboard' });
        }
        
        document.getElementById('settingsForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const settings = {
                workDuration: parseInt(document.getElementById('workDuration').value),
                shortBreakDuration: parseInt(document.getElementById('shortBreakDuration').value),
                longBreakDuration: parseInt(document.getElementById('longBreakDuration').value),
                hourFormat: document.getElementById('hourFormat').checked,
                notificationEnabled: document.getElementById('notificationEnabled').checked,
                notificationCount: parseInt(document.getElementById('notificationCount').value),
                alarmVolume: parseInt(document.getElementById('alarmVolume').value)
            };
            
            vscode.postMessage({ 
                command: 'updateSettings',
                settings: settings
            });
        });
    </script>
</body>
</html>`;
  }
}
