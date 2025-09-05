import * as vscode from 'vscode';
import * as ejs from 'ejs';
import * as fs from 'fs';
import * as path from 'path';
import { SettingsManager } from '@/features/settings/service/settings-manager.service';
import { TodoManager } from '@/features/todo/service/todo-manager.service';
import { PomodoroSession, PomodoroState, SessionType, Todo } from '@/types';

export class PomodoroPanel {
  public static currentPanel: PomodoroPanel | undefined;
  public static readonly viewType = 'pomodoroPanel';

  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private currentSession: PomodoroSession | null = null;
  private isSettingsView: boolean = false;
  private readonly extensionUri: vscode.Uri;
  private todoManager: TodoManager;

  private getTemplatePath(templateName: string): string {
    return path.join(
      this.extensionUri.fsPath,
      'src',
      'components',
      'page',
      templateName,
      'index.ejs'
    );
  }

  private getStyleUri(
    webview: vscode.Webview,
    templateName: string = 'dashboard'
  ): vscode.Uri {
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'src',
        'components',
        'page',
        templateName,
        'style.css'
      )
    );
    return styleUri;
  }

  private getGlobalStyleUri(webview: vscode.Webview): vscode.Uri {
    const globalStyleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'src',
        'components',
        'shared',
        'global.css'
      )
    );
    return globalStyleUri;
  }

  private getScriptUri(
    webview: vscode.Webview,
    templateName: string = 'dashboard'
  ): vscode.Uri {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.extensionUri,
        'src',
        'components',
        'page',
        templateName,
        'script.js'
      )
    );
    return scriptUri;
  }

  private getSVGIcon(iconName: string): string {
    try {
      const iconPath = path.join(
        this.extensionUri.fsPath,
        'src',
        'assets',
        'icon',
        `${iconName}.svg`
      );
      return fs.readFileSync(iconPath, 'utf8');
    } catch (error) {
      console.error(`Failed to load SVG icon: ${iconName}`, error);
      // Return a fallback SVG for missing icons
      return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    }
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
    this.todoManager = TodoManager.getInstance();

    this.update();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case 'toggleTimer':
            vscode.commands.executeCommand('pomodoro.toggleTimer');
            break;
          case 'skip':
            vscode.commands.executeCommand('pomodoro.skip');
            break;
          case 'switchSession':
            vscode.commands.executeCommand(
              'pomodoro.switchSession',
              message.sessionType
            );
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
          case 'testSound':
            // No need to handle this in extension - it's handled in webview JavaScript
            break;
          case 'refreshPanel':
            this.update();
            break;
          case 'createTask':
            this.handleCreateTask(message.task, message.requestId);
            break;
          case 'updateTask':
            this.handleUpdateTask(
              message.taskId,
              message.updates,
              message.requestId
            );
            break;
          case 'completeTask':
            this.handleCompleteTask(message.taskId, message.requestId);
            break;
          case 'deleteTask':
            this.handleDeleteTask(message.taskId, message.requestId);
            break;
          case 'setCurrentTask':
            this.handleSetCurrentTask(message.taskId, message.requestId);
            break;
          case 'clearCurrentTask':
            this.handleClearCurrentTask(message.requestId);
            break;
          case 'clearAllTasks':
            this.handleClearAllTasks();
            break;
          case 'clearCompletedTasks':
            this.handleClearCompletedTasks();
            break;
          case 'refreshStatusBar':
            this.handleRefreshStatusBar();
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
      const isTimerActive = await vscode.commands.executeCommand(
        'pomodoro.isTimerActive'
      );

      if (isTimerActive) {
        vscode.window.showWarningMessage(
          'Cannot change settings while timer is running!'
        );
        return;
      }

      await SettingsManager.updateSettings(settings);
      vscode.commands.executeCommand('pomodoro.updateSettings');

      // Auto-redirect to dashboard after successful save
      this.isSettingsView = false;
      this.update();

      // Show success message in dashboard context
      vscode.window.showInformationMessage('Settings updated successfully!');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('PomodoroPanel: Settings update failed', error);
      vscode.window.showErrorMessage(
        `Failed to update settings: ${errorMessage}`
      );
    }
  }

  private async handleCreateTask(
    taskData: {
      title: string;
      description?: string;
      estimatedPomodoros?: number;
      estimatedMinutes?: number;
      priority?: 'low' | 'medium' | 'high';
    },
    requestId?: string
  ): Promise<void> {
    try {
      const newTask = await this.todoManager.createTask(
        taskData.title,
        taskData.description,
        taskData.estimatedPomodoros,
        taskData.estimatedMinutes,
        taskData.priority
      );

      // Send targeted response
      if (requestId) {
        this.sendAjaxResponse(requestId, true, { task: newTask });
      }

      // Send targeted event to all listeners
      const currentTaskId = this.todoManager.getTodoState().currentTaskId;
      this.panel.webview.postMessage({
        command: 'taskCreated',
        task: newTask,
        currentTaskId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to create task';

      if (requestId) {
        this.sendAjaxResponse(requestId, false, null, errorMessage);
      } else {
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  }

  private async handleUpdateTask(
    taskId: string,
    updates: Partial<Todo>,
    requestId?: string
  ): Promise<void> {
    try {
      const updatedTask = await this.todoManager.updateTask(taskId, updates);

      if (requestId) {
        this.sendAjaxResponse(requestId, true, { task: updatedTask });
      }

      const currentTaskId = this.todoManager.getTodoState().currentTaskId;
      this.panel.webview.postMessage({
        command: 'taskUpdated',
        task: updatedTask,
        currentTaskId,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update task';

      if (requestId) {
        this.sendAjaxResponse(requestId, false, null, errorMessage);
      } else {
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  }

  private async handleCompleteTask(
    taskId: string,
    requestId?: string
  ): Promise<void> {
    try {
      const completedTask = await this.todoManager.completeTask(taskId);

      if (requestId) {
        this.sendAjaxResponse(requestId, true, { task: completedTask });
      }

      const currentTaskId = this.todoManager.getTodoState().currentTaskId;
      this.panel.webview.postMessage({
        command: 'taskUpdated',
        task: completedTask,
        currentTaskId,
      });

      // Check if all tasks are completed and show notification
      const todoState = this.todoManager.getTodoState();
      const completedTasks = todoState.tasks.filter((task) => task.completed);

      if (completedTasks.length >= 2) {
        vscode.window
          .showInformationMessage(
            'Congratulations! All tasks completed!',
            'Delete All Completed Tasks'
          )
          .then((selection) => {
            if (selection === 'Delete All Completed Tasks') {
              this.handleClearCompletedTasks();
            }
          });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to complete task';

      if (requestId) {
        this.sendAjaxResponse(requestId, false, null, errorMessage);
      } else {
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  }

  private async handleDeleteTask(
    taskId: string,
    requestId?: string
  ): Promise<void> {
    try {
      await this.todoManager.deleteTask(taskId);

      if (requestId) {
        this.sendAjaxResponse(requestId, true, { taskId });
      }

      const todoState = this.todoManager.getTodoState();
      this.panel.webview.postMessage({
        command: 'taskDeleted',
        taskId,
        currentTaskId: todoState.currentTaskId,
        tasks: todoState.tasks,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to delete task';

      if (requestId) {
        this.sendAjaxResponse(requestId, false, null, errorMessage);
      } else {
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  }

  private async handleSetCurrentTask(
    taskId: string,
    requestId?: string
  ): Promise<void> {
    try {
      await this.todoManager.setCurrentTask(taskId);

      if (requestId) {
        this.sendAjaxResponse(requestId, true, { taskId });
      }

      // Immediately update status bar
      vscode.commands.executeCommand('pomodoro.refreshStatusBar');

      const todoState = this.todoManager.getTodoState();
      this.panel.webview.postMessage({
        command: 'taskSelected',
        taskId,
        tasks: todoState.tasks,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to set current task';

      if (requestId) {
        this.sendAjaxResponse(requestId, false, null, errorMessage);
      } else {
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  }

  private async handleClearCurrentTask(requestId?: string): Promise<void> {
    try {
      await this.todoManager.clearCurrentTask();

      if (requestId) {
        this.sendAjaxResponse(requestId, true, { taskId: null });
      }

      // Immediate status bar refresh
      vscode.commands.executeCommand('pomodoro.refreshStatusBar');

      this.panel.webview.postMessage({
        command: 'taskSelected',
        taskId: null,
        tasks: this.todoManager.getTodoState().tasks,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to clear current task';

      if (requestId) {
        this.sendAjaxResponse(requestId, false, null, errorMessage);
      } else {
        vscode.window.showErrorMessage(errorMessage);
      }
    }
  }

  private async handleClearAllTasks(): Promise<void> {
    try {
      const result = await vscode.window.showWarningMessage(
        'Are you sure you want to clear all tasks?',
        { modal: true },
        'Clear All'
      );

      if (result === 'Clear All') {
        await this.todoManager.clearAllTasks();
        this.sendTodoUpdate();
        vscode.window.showInformationMessage('All tasks cleared');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to clear tasks';
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  private async handleClearCompletedTasks(): Promise<void> {
    try {
      await this.todoManager.clearCompletedTasks();
      const todoState = this.todoManager.getTodoState();

      this.panel.webview.postMessage({
        command: 'tasksCleared',
        type: 'completed',
        todoState: todoState,
      });

      vscode.commands.executeCommand('pomodoro.refreshStatusBar');
      vscode.window.showInformationMessage('Completed tasks cleared');
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to clear completed tasks';
      vscode.window.showErrorMessage(errorMessage);
    }
  }

  private handleRefreshStatusBar(): void {
    // Trigger status bar refresh by emitting a session event
    vscode.commands.executeCommand('pomodoro.refreshStatusBar');
  }

  private sendTodoUpdate(): void {
    if (this.panel.webview && !this.isSettingsView) {
      const todoState = this.todoManager.getTodoState();
      this.panel.webview.postMessage({
        command: 'updateTodos',
        todoState,
      });
    }
  }

  private sendAjaxResponse(
    requestId: string,
    success: boolean,
    data: any = null,
    error?: string
  ): void {
    if (this.panel.webview) {
      this.panel.webview.postMessage({
        requestId,
        success,
        data,
        error,
      });
    }
  }

  public updateSession(session: PomodoroSession): void {
    this.currentSession = session;

    if (this.panel.webview && !this.isSettingsView) {
      this.panel.webview.postMessage({
        command: 'updateSession',
        session: session,
        isTimerActive:
          session.state !== PomodoroState.IDLE &&
          session.state !== PomodoroState.PAUSED,
      });
    }
  }

  public dispose(): void {
    PomodoroPanel.currentPanel = undefined;

    // Send cleanup message to webview before disposal
    try {
      this.panel.webview.postMessage({ command: 'cleanup' });
    } catch (error) {
      // Ignore errors if webview is already disposed
    }

    // Dispose of the panel
    this.panel.dispose();

    // Clean up all disposables
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        try {
          disposable.dispose();
        } catch (error) {
          console.error('Error disposing resource:', error);
        }
      }
    }

    // Clear references to prevent memory leaks
    this.currentSession = null;
    this.disposables = [];
  }

  private update(): void {
    const webview = this.panel.webview;
    this.panel.title = this.isSettingsView
      ? 'Pomodoro Settings'
      : 'Pomodoro Timer';
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

    const settings = SettingsManager.getSettings();
    const todoState = this.todoManager.getTodoState();
    const currentTask = this.todoManager.getCurrentTask();

    const minutes = Math.floor(session.timeRemaining / 60000);
    const seconds = Math.floor((session.timeRemaining % 60000) / 1000);
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    const isTimerActive =
      session.state !== PomodoroState.IDLE &&
      session.state !== PomodoroState.PAUSED;
    let buttonText = 'Start';

    if (session.state === 'idle') {
      buttonText = 'Start';
    } else if (isTimerActive) {
      buttonText = 'Pause';
    } else if (session.state === 'paused') {
      buttonText = 'Start'; // Always show Start after skip/pause for better UX
    }

    try {
      const templatePath = this.getTemplatePath('dashboard');
      const template = fs.readFileSync(templatePath, 'utf8');
      const styleUri = this.getStyleUri(this.panel.webview, 'dashboard');
      const globalStyleUri = this.getGlobalStyleUri(this.panel.webview);
      const scriptUri = this.getScriptUri(this.panel.webview, 'dashboard');
      const plusIcon = this.getSVGIcon('plus');
      const trashIcon = this.getSVGIcon('trash');
      const pomodoroIcon = this.getSVGIcon('timer');
      const targetIcon = this.getSVGIcon('target');
      const trophyIcon = this.getSVGIcon('trophy');
      const partyPopperIcon = this.getSVGIcon('party-popper');

      return ejs.render(template, {
      timeString,
      sessionType: session.sessionType,
      buttonText,
      isTimerActive,
      completedPomodoros: session.completedPomodoros,
      settings,
      todoState,
      currentTask,
      styleUri: styleUri.toString(),
      globalStyleUri: globalStyleUri.toString(),
      scriptUri: scriptUri.toString(),
      plusIcon,
      trashIcon,
      pomodoroIcon,
      targetIcon,
        trophyIcon,
        partyPopperIcon,
      });
    } catch (error) {
      console.error('Error rendering dashboard template:', error);
      return this.getErrorHtml(error);
    }
  }

  private renderSettingsTemplate(): string {
    const settings = SettingsManager.getSettings();
    const isTimerActive =
      this.currentSession?.state !== PomodoroState.IDLE &&
      this.currentSession?.state !== PomodoroState.PAUSED;

    try {
      const templatePath = this.getTemplatePath('settings');
      const template = fs.readFileSync(templatePath, 'utf8');
      const styleUri = this.getStyleUri(this.panel.webview, 'settings');
      const globalStyleUri = this.getGlobalStyleUri(this.panel.webview);
      const scriptUri = this.getScriptUri(this.panel.webview, 'settings');

        return ejs.render(template, {
          settings,
          isTimerActive,
          styleUri: styleUri.toString(),
          globalStyleUri: globalStyleUri.toString(),
          scriptUri: scriptUri.toString(),
        });
      } catch (error) {
        console.error('Error rendering settings template:', error);
        return this.getErrorHtml(error);
      }
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
