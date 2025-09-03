# 🍅 Criztian's Pomodoro Timer
A simple and effective Pomodoro timer extension integrated directly into Visual Studio Code. Stay focused and productive with the Pomodoro Technique without leaving your development environment.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-1.70.0+-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Features

- **🎯 Integrated Timer**: Timer displays right in your VS Code status bar
- **⏰ Flexible Sessions**: Work sessions, short breaks, and long breaks
- **📝 Task Tracking**: Add notes about what you're working on
- **🔧 Customizable**: Adjust timer durations to fit your workflow
- **🔔 Smart Notifications**: Get notified when sessions complete
- **📊 Session History**: Track your productivity sessions
- **🎨 Native Integration**: Seamlessly integrates with VS Code's UI

## 🚀 Quick Start

### Installation

1. Open VS Code
2. Go to Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "Pomodoro Timer"
4. Click Install

### Basic Usage

1. **Start a Work Session**: Click the tomato icon in the status bar or use `Ctrl+Shift+P` → "Start Pomodoro"
2. **Add Your Task** (optional): Enter what you're working on when prompted
3. **Work**: The timer counts down in your status bar
4. **Take Breaks**: Use "Short Break" or "Long Break" commands when your work session ends
5. **Track Progress**: View your session history in the sidebar

## 📖 User Guide

### Status Bar

The status bar shows your current session status:
- 🍅 `25:00 - Building user login` (Work session with task)
- ☕ `05:00 - Short break` (Break session)
- ⏸️ `15:30 - Paused` (Paused session)

### Commands

Access these commands through the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`):

| Command | Description | Default Duration |
|---------|-------------|------------------|
| `Start Pomodoro` | Begin a work session | 25 minutes |
| `Short Break` | Start a short break | 5 minutes |
| `Long Break` | Start a long break | 15 minutes |
| `Pause Timer` | Pause/resume current session | - |
| `Stop Timer` | Stop and reset current session | - |
| `Pomodoro Settings` | Open settings panel | - |
| `Show Pomodoro Sidebar` | Toggle detailed sidebar view | - |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+P` (Windows/Linux)<br>`Cmd+Alt+P` (Mac) | Start Pomodoro |
| `Ctrl+Alt+S` (Windows/Linux)<br>`Cmd+Alt+S` (Mac) | Short Break |
| `Ctrl+Alt+L` (Windows/Linux)<br>`Cmd+Alt+L` (Mac) | Long Break |
| `Ctrl+Alt+Space` (Windows/Linux)<br>`Cmd+Alt+Space` (Mac) | Pause/Resume |

### Settings

Customize your Pomodoro experience:

1. Click the settings gear icon in the status bar, or
2. Use Command Palette → "Pomodoro Settings"

**Available Settings:**
- **Work Duration**: 1-60 minutes (default: 25)
- **Short Break Duration**: 1-60 minutes (default: 5)
- **Long Break Duration**: 1-60 minutes (default: 15)
- **Notification Sound**: Enable/disable audio alerts
- **Auto-start Breaks**: Automatically start break timers

### Sidebar Panel

Access detailed information by clicking the sidebar button:

- **Current Session**: Timer, task, and controls
- **Session History**: View past sessions with timestamps
- **Statistics**: Daily and weekly productivity metrics
- **Quick Settings**: Adjust timers without opening settings panel

## 🛠️ Development

### Prerequisites

- Node.js 16.x or higher
- VS Code 1.70.0 or higher
- TypeScript 4.x

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/vscode-pomodoro-timer.git
cd vscode-pomodoro-timer

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Open in VS Code
code .
```

### Running the Extension

1. Press `F5` to open a new Extension Development Host window
2. The extension will be automatically activated
3. Test the commands and functionality

### Build Commands

```bash
# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Run tests
npm run test

# Package extension
npm run package

# Lint code
npm run lint
```

### Project Structure

```
├── src/
│   ├── extension.ts          # Main extension entry point
│   ├── timer/
│   │   ├── TimerManager.ts   # Core timer logic
│   │   └── TimerState.ts     # Timer state management
│   ├── ui/
│   │   ├── StatusBar.ts      # Status bar integration
│   │   ├── Sidebar.ts        # Sidebar panel
│   │   └── Settings.ts       # Settings management
│   ├── storage/
│   │   └── SessionStorage.ts # Session data persistence
│   └── utils/
│       └── Notifications.ts  # Notification system
├── resources/               # Icons and assets
├── package.json            # Extension manifest
└── README.md              # This file
```

### Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --grep "TimerManager"

# Run tests with coverage
npm run test:coverage
```

## 🔧 Configuration

The extension can be configured through VS Code settings:

```json
{
  "pomodoro.workDuration": 25,
  "pomodoro.shortBreakDuration": 5,
  "pomodoro.longBreakDuration": 15,
  "pomodoro.enableNotifications": true,
  "pomodoro.enableSounds": true,
  "pomodoro.autoStartBreaks": false,
  "pomodoro.showInStatusBar": true
}
```

## 📊 Data Storage

The extension stores data locally using VS Code's built-in storage:

- **Settings**: Stored in global state (across all workspaces)
- **Session History**: Stored in workspace state (per project)
- **Current Session**: Stored in global state with workspace context

No data is sent to external servers - everything stays on your machine.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

1. Check existing issues or create a new one
2. Follow the coding standards (ESLint + Prettier)
3. Add tests for new functionality
4. Update documentation if needed
5. Ensure all tests pass

## 🐛 Troubleshooting

### Common Issues

**Timer not updating in status bar**
- Try reloading VS Code window (`Ctrl+Shift+P` → "Developer: Reload Window")

**Notifications not working**
- Check system notification permissions for VS Code
- Verify notification settings in extension settings

**Extension not loading**
- Check VS Code version compatibility (1.70.0+)
- Look for errors in Developer Console (`Help` → `Toggle Developer Tools`)

**Timer inaccurate after system sleep**
- This is expected behavior - timers pause during system sleep
- Use the resume function to continue your session

### Getting Help

- 📖 Check our [FAQ](docs/FAQ.md)
- 🐛 [Report a bug](https://github.com/yourusername/vscode-pomodoro-timer/issues)
- 💡 [Request a feature](https://github.com/yourusername/vscode-pomodoro-timer/issues)
- 💬 [Discussion forum](https://github.com/yourusername/vscode-pomodoro-timer/discussions)

## 📈 Roadmap

### Version 1.1 (Next Release)
- [ ] Pomodoro cycle automation (4 work sessions → long break)
- [ ] Custom notification sounds
- [ ] Productivity statistics and charts
- [ ] Export session data

### Version 1.2 (Future)
- [ ] Team collaboration features
- [ ] Integration with task management tools
- [ ] Advanced analytics dashboard
- [ ] Multiple workspace support

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the [Pomodoro Technique](https://en.wikipedia.org/wiki/Pomodoro_Technique) by Francesco Cirillo
- Built with the [VS Code Extension API](https://code.visualstudio.com/api)
- Icons from [VS Code Codicons](https://microsoft.github.io/vscode-codicons/dist/codicon.html)

## 📞 Support

If you find this extension helpful, please:
- ⭐ Star the repository
- 📝 Leave a review on the VS Code Marketplace
- 🐛 Report bugs and suggest features
- 💬 Share it with fellow developers!

---

**Happy coding with focused Pomodoro sessions! 🍅**