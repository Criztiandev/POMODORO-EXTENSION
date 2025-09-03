import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "your-pomodoro" is now active!');
	const disposable = vscode.commands.registerCommand('your-pomodoro.helloWorld', () => {
		vscode.window.showInformationMessage('Tang ina mo Jepoy Dizon');
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
