const vscode = acquireVsCodeApi();

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
        panelPosition: document.querySelector('input[name="panelPosition"]:checked').value,
        notificationType: document.querySelector('input[name="notificationType"]:checked').value
    };
    
    vscode.postMessage({ 
        command: 'updateSettings',
        settings: settings
    });
});