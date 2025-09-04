import * as vscode from 'vscode';
import { PomodoroSession } from '../types';

export class PomodoroPanel {
  public static currentPanel: PomodoroPanel | undefined;
  public static readonly viewType = 'pomodoroPanel';

  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];

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

    this.update();
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  public updateSession(session: PomodoroSession): void {
    // Future: Update panel with session data
    this.update();
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
    this.panel.title = 'Pomodoro Timer';
    this.panel.webview.html = this.getHtmlForWebview(webview);
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
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
            max-width: 600px;
            margin: 0 auto;
            text-align: center;
        }
        h1 {
            color: var(--vscode-titleBar-activeForeground);
            margin-bottom: 20px;
        }
        .placeholder {
            padding: 40px;
            border: 2px dashed var(--vscode-panel-border);
            border-radius: 8px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🍅 Pomodoro Timer</h1>
        <div class="placeholder">
            <p>Panel UI coming soon...</p>
            <p>Use the status bar for timer controls</p>
        </div>
    </div>
</body>
</html>`;
  }
}
