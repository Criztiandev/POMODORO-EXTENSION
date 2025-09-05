# Your Pomodoro - VS Code Extension

A simple and effective Pomodoro timer for VS Code to boost your productivity.
This extension helps you implement the Pomodoro Technique directly in your
development environment with integrated task management and customizable
settings.

## Features

### **Pomodoro Timer**

- Configurable work sessions (1-60 minutes, default: 25 minutes)
- Short breaks (1-30 minutes, default: 5 minutes)
- Long breaks (1-60 minutes, default: 15 minutes)
- Visual timer display in the status bar
- System notifications when sessions complete

### **Task Management**

- Integrated todo list with task creation and management
- Task prioritization (low, medium, high)
- Estimated time tracking (pomodoros and minutes)
- Task completion tracking with timestamps
- Current task selection and focus

### **Customizable Settings**

- Adjustable session durations
- Toggle 24-hour time format
- Enable/disable notifications
- Configurable status bar position (left/right)
- Settings panel with real-time validation

### **Productivity Features**

- Timer controls: start, pause, reset, skip
- Session type switching
- Non-intrusive status bar integration
- Persistent settings and task storage

## Installation

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "Your Pomodoro"
4. Click Install

## Usage

### Quick Start

1. **Open the Pomodoro Panel**: Use `Ctrl+Shift+P` and search for "Open Pomodoro
   Panel"
2. **Start a Session**: Click the "Start" button or use the "Start Pomodoro"
   command
3. **Manage Tasks**: Add tasks to your todo list and track your progress
4. **Customize Settings**: Access settings through the panel to adjust durations
   and preferences

### Commands

Access these commands through the Command Palette (`Ctrl+Shift+P`):

- `Pomodoro: Start Pomodoro` - Start a new pomodoro session
- `Pomodoro: Pause Timer` - Pause the current session
- `Pomodoro: Reset Timer` - Reset the timer to initial state
- `Pomodoro: Skip Current Session` - Skip to the next session type
- `Pomodoro: Open Pomodoro Panel` - Open the main dashboard
- `Pomodoro: Toggle Timer` - Start/pause the timer

### Status Bar

The timer is displayed in your VS Code status bar showing:

- Current session type (Work/Short Break/Long Break)
- Remaining time in MM:SS format
- Clickable interface for quick timer control

### Settings Panel

Configure your Pomodoro experience:

- **Pomodoro Duration**: Set work session length (1-60 minutes)
- **Short Break Duration**: Set short break length (1-30 minutes)
- **Long Break Duration**: Set long break length (1-60 minutes)
- **Hour Format**: Choose 24-hour time display
- **Notifications**: Enable completion notifications
- **Status Bar Position**: Position timer on left or right side

## Configuration

You can also configure the extension through VS Code settings (`settings.json`):

```json
{
  "pomodoroTimer.workDuration": 25,
  "pomodoroTimer.shortBreakDuration": 5,
  "pomodoroTimer.longBreakDuration": 15,
  "pomodoroTimer.hourFormat": true,
  "pomodoroTimer.notificationEnabled": true,
  "pomodoroTimer.panelPosition": "left"
}
```

## Architecture

The extension is built with a modular architecture:

```
src/
├── extension.ts              # Main extension entry point
├── features/
│   ├── timer/               # Timer logic and services
│   ├── todo/                # Task management system
│   ├── settings/            # Configuration management
│   └── ui/                  # User interface components
└── components/
    └── page/                # Panel UI templates (EJS)
```

### Key Components

- **PomodoroTimer**: Core timer functionality with event system
- **TodoManager**: Task management and persistence
- **SettingsManager**: Configuration handling and validation
- **StatusBarManager**: Status bar integration
- **PomodoroPanel**: Main dashboard UI

## Development

### Prerequisites

- Node.js 16+
- VS Code 1.103+
- TypeScript knowledge

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd pomodor-personal

# Install dependencies
npm install

# Build the extension
npm run compile

# Watch for changes
npm run watch
```

### Scripts

- `npm run compile` - Build the extension
- `npm run watch` - Watch mode for development
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run package` - Package for production
- `npm test` - Run tests

### Testing

1. **Open in VS Code**: Open the project folder in VS Code
2. **Launch Extension Development Host**: Press `F5` to open a new VS Code window with your extension loaded
3. **Test Your Changes**: Use the extension in the new window
4. **Reload After Changes**: Press `Ctrl+R` in the Extension Development Host window to reload and apply your changes
5. **Debug**: Use breakpoints and the Debug Console in the main VS Code window

## Contributing

We welcome contributions to make Your Pomodoro even better! Here's how you can
help:

### Ways to Contribute

- **Bug Reports**: Found a bug? Please open an issue with detailed steps to
  reproduce
- **Feature Requests**: Have an idea? Share it in the issues section
- **Documentation**: Help improve documentation, examples, or tutorials
- **Code Contributions**: Submit bug fixes, new features, or improvements
- **Testing**: Help test new features and report feedback
- **Design**: Contribute to UI/UX improvements

### Development Workflow

1. **Fork & Clone**

   ```bash
   git clone https://github.com/your-username/pomodor-personal.git
   cd pomodor-personal
   npm install
   ```

2. **Create a Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

3. **Make Your Changes**
   - Follow the existing code style and patterns
   - Add tests for new functionality
   - Update documentation if needed
   - Ensure TypeScript types are properly defined

4. **Test Your Changes**

   ```bash
   npm run lint          # Check code style
   npm run check-types   # Verify TypeScript
   npm test             # Run tests
   npm run compile      # Build extension
   ```

5. **Test in VS Code**
   - Open the project in VS Code
   - Press `F5` to launch Extension Development Host (opens new VS Code window)
   - Test all affected functionality in the new window
   - Press `Ctrl+R` in the Extension Development Host to reload after making changes
   - Verify settings and UI work correctly

6. **Commit Your Changes**

   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   # or
   git commit -m "fix: resolve timer reset issue"
   ```

   **Commit Convention:**
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `style:` - Code style changes
   - `refactor:` - Code refactoring
   - `test:` - Test additions/modifications
   - `chore:` - Maintenance tasks

7. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub with:
   - Clear description of changes
   - Screenshots/videos for UI changes
   - Reference to related issues

### Code Guidelines

- **TypeScript**: Use strict typing, avoid `any`
- **Architecture**: Follow the existing modular structure
- **Services**: Place business logic in service classes
- **UI**: Use EJS templates for panel views
- **Events**: Use the event system for component communication
- **Settings**: Add new settings to the interface and validation

### Project Structure Guidelines

```
src/
├── features/           # Feature-based modules
│   ├── timer/         # Timer functionality
│   ├── todo/          # Task management
│   ├── settings/      # Configuration
│   └── ui/            # UI services
├── components/        # UI templates
└── types/            # Shared type definitions
```

### Adding New Features

1. **Create Feature Module**

   ```
   src/features/your-feature/
   ├── service/your-feature.service.ts
   ├── types/your-feature.interface.ts
   └── index.ts
   ```

2. **Add Settings (if needed)**
   - Update `settings.interface.ts`
   - Add to `settings-manager.service.ts`
   - Include in `package.json` configuration

3. **Update UI (if needed)**
   - Modify EJS templates in `components/page/`
   - Update corresponding JavaScript files

### Review Process

- All PRs require review before merging
- Automated checks must pass (linting, TypeScript, tests)
- Manual testing in VS Code environment
- Documentation updates reviewed for accuracy

### Getting Help

- **Questions**: Open a discussion or issue
- **Documentation**: Check existing docs and code comments
- **Bugs**: Provide minimal reproduction steps
- **Ideas**: Discuss feasibility before implementing

### Recognition

Contributors will be acknowledged in:

- README.md contributors section
- Release notes for significant contributions
- Special thanks for first-time contributors

## License

This project is licensed under the MIT License.

## Changelog

### v0.0.1

- Initial release with core Pomodoro functionality
- Task management system
- Configurable settings
- Status bar integration
- System notifications

## Support

If you encounter any issues or have feature requests, please
[open an issue](https://github.com/criztiandev/pomodor-personal/issues).

---

**Happy coding with focused productivity!**
