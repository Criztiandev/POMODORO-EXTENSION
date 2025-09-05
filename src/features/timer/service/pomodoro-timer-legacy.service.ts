import { EventEmitter } from 'events';
import { PomodoroState, PomodoroSession, PomodoroConfig, SessionType } from '@/types';
import { SettingsManager } from '@/features/settings/service/settings-manager.service';

export class PomodoroTimer extends EventEmitter {
  private session: PomodoroSession;
  private config: PomodoroConfig;
  private timer: NodeJS.Timeout | null = null;
  private currentCyclePosition: number = 0; // Track position in cycle: 0,1,2,3,4 (work,short,work,short,work->long)

  constructor(config?: Partial<PomodoroConfig>) {
    super();

    // Initialize config first
    this.config = {
      workDuration: 25 * 60 * 1000,
      shortBreakDuration: 5 * 60 * 1000,
      longBreakDuration: 15 * 60 * 1000,
      pomodorosBeforeLongBreak: 3,
    };

    // Load from settings
    this.loadConfigFromSettings();

    this.session = {
      state: PomodoroState.IDLE,
      sessionType: SessionType.WORK,
      timeRemaining: this.config.workDuration,
      totalTime: this.config.workDuration,
      completedPomodoros: 0,
    };
  }

  private loadConfigFromSettings(): void {
    const settings = SettingsManager.getSettings();
    this.config = {
      workDuration: settings.workDuration * 60 * 1000,
      shortBreakDuration: settings.shortBreakDuration * 60 * 1000,
      longBreakDuration: settings.longBreakDuration * 60 * 1000,
      pomodorosBeforeLongBreak: 3, // work(1)->short->work(2)->short->work(3)->long
    };
  }

  start(): void {
    if (this.session.state === PomodoroState.IDLE) {
      // Starting from idle - use the current sessionType to determine state
      switch (this.session.sessionType) {
        case SessionType.WORK:
          this.session.state = PomodoroState.WORK;
          break;
        case SessionType.SHORT_BREAK:
          this.session.state = PomodoroState.SHORT_BREAK;
          break;
        case SessionType.LONG_BREAK:
          this.session.state = PomodoroState.LONG_BREAK;
          break;
      }
    } else if (this.session.state === PomodoroState.PAUSED) {
      // Resuming from pause - use sessionType to determine correct running state
      switch (this.session.sessionType) {
        case SessionType.WORK:
          this.session.state = PomodoroState.WORK;
          break;
        case SessionType.SHORT_BREAK:
          this.session.state = PomodoroState.SHORT_BREAK;
          break;
        case SessionType.LONG_BREAK:
          this.session.state = PomodoroState.LONG_BREAK;
          break;
      }
    }

    this.startTimer();
    this.emit('stateChanged', this.session);
  }

  pause(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.session.state = PomodoroState.PAUSED;
    this.emit('stateChanged', this.session);
  }

  reset(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Reset to work session with appropriate duration
    let duration = this.config.workDuration;
    switch (this.session.sessionType) {
      case SessionType.WORK:
        duration = this.config.workDuration;
        break;
      case SessionType.SHORT_BREAK:
        duration = this.config.shortBreakDuration;
        break;
      case SessionType.LONG_BREAK:
        duration = this.config.longBreakDuration;
        break;
    }

    this.session = {
      state: PomodoroState.PAUSED,
      sessionType: this.session.sessionType, // Maintain current session type
      timeRemaining: duration,
      totalTime: duration,
      completedPomodoros: this.session.completedPomodoros,
    };

    this.emit('stateChanged', this.session);
  }

  skip(): void {
    // Only allow skip if timer is actually running
    if (!this.timer) {
      return; // Do nothing if timer is not active
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.handleSessionSkip();
  }

  getSession(): PomodoroSession {
    return { ...this.session };
  }

  updateSettings(): void {
    this.loadConfigFromSettings();
    // If idle, update the display time based on current session type
    if (this.session.state === PomodoroState.IDLE) {
      switch (this.session.sessionType) {
        case SessionType.WORK:
          this.session.timeRemaining = this.config.workDuration;
          this.session.totalTime = this.config.workDuration;
          break;
        case SessionType.SHORT_BREAK:
          this.session.timeRemaining = this.config.shortBreakDuration;
          this.session.totalTime = this.config.shortBreakDuration;
          break;
        case SessionType.LONG_BREAK:
          this.session.timeRemaining = this.config.longBreakDuration;
          this.session.totalTime = this.config.longBreakDuration;
          break;
      }
      this.emit('stateChanged', this.session);
    }
  }

  isTimerActive(): boolean {
    return this.timer !== null;
  }

  switchToSession(sessionType: 'work' | 'shortBreak' | 'longBreak'): void {
    // Stop current timer if running
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    let newSessionType: SessionType;
    let duration: number;

    // Set new session type and determine the correct state
    switch (sessionType) {
      case 'work':
        newSessionType = SessionType.WORK;
        duration = this.config.workDuration;
        break;
      case 'shortBreak':
        newSessionType = SessionType.SHORT_BREAK;
        duration = this.config.shortBreakDuration;
        break;
      case 'longBreak':
        newSessionType = SessionType.LONG_BREAK;
        duration = this.config.longBreakDuration;
        break;
    }

    // Update session
    this.session.sessionType = newSessionType;
    this.session.timeRemaining = duration;
    this.session.totalTime = duration;

    // Set state based on session type - work starts as IDLE, breaks as PAUSED
    if (sessionType === 'work') {
      this.session.state = PomodoroState.IDLE;
    } else {
      this.session.state = PomodoroState.PAUSED;
    }

    this.emit('stateChanged', this.session);
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      this.session.timeRemaining -= 1000;

      if (this.session.timeRemaining <= 0) {
        this.handleSessionComplete();
      } else {
        this.emit('tick', this.session);
      }
    }, 1000);
  }

  private handleSessionComplete(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Handle cycle progression: work(0) -> short(1) -> work(2) -> short(3) -> work(4) -> long(5) -> repeat
    if (this.session.sessionType === SessionType.WORK) {
      this.session.completedPomodoros++;
      this.currentCyclePosition++;

      if (this.currentCyclePosition === 6) {
        // After long break, restart cycle
        this.currentCyclePosition = 0;
        this.session.sessionType = SessionType.WORK;
        this.session.timeRemaining = this.config.workDuration;
        this.session.totalTime = this.config.workDuration;
      } else if (this.currentCyclePosition % 2 === 1) {
        // Odd positions (1,3) are short breaks
        this.session.sessionType = SessionType.SHORT_BREAK;
        this.session.timeRemaining = this.config.shortBreakDuration;
        this.session.totalTime = this.config.shortBreakDuration;
      } else if (this.currentCyclePosition === 5) {
        // Position 5 is long break (after 3rd work session)
        this.session.sessionType = SessionType.LONG_BREAK;
        this.session.timeRemaining = this.config.longBreakDuration;
        this.session.totalTime = this.config.longBreakDuration;
      } else {
        // Even positions (2,4) are work sessions
        this.session.sessionType = SessionType.WORK;
        this.session.timeRemaining = this.config.workDuration;
        this.session.totalTime = this.config.workDuration;
      }
    } else {
      // Break completed, move to next in cycle
      this.currentCyclePosition++;
      
      if (this.currentCyclePosition === 6) {
        // After long break, restart cycle
        this.currentCyclePosition = 0;
      }
      
      this.session.sessionType = SessionType.WORK;
      this.session.timeRemaining = this.config.workDuration;
      this.session.totalTime = this.config.workDuration;
    }

    // Set to paused after session completes - user must click to continue
    this.session.state = PomodoroState.PAUSED;
    this.emit('sessionComplete', this.session);
    this.emit('stateChanged', this.session);
  }

  private handleSessionSkip(): void {
    // Dedicated skip logic - DO NOT call handleSessionComplete() to avoid notifications
    
    // Handle cycle progression: work(0) -> short(1) -> work(2) -> short(3) -> work(4) -> long(5) -> repeat
    if (this.session.sessionType === SessionType.WORK) {
      this.session.completedPomodoros++;
      this.currentCyclePosition++;

      if (this.currentCyclePosition === 6) {
        // After long break, restart cycle
        this.currentCyclePosition = 0;
        this.session.sessionType = SessionType.WORK;
        this.session.timeRemaining = this.config.workDuration;
        this.session.totalTime = this.config.workDuration;
      } else if (this.currentCyclePosition % 2 === 1) {
        // Odd positions (1,3) are short breaks
        this.session.sessionType = SessionType.SHORT_BREAK;
        this.session.timeRemaining = this.config.shortBreakDuration;
        this.session.totalTime = this.config.shortBreakDuration;
      } else if (this.currentCyclePosition === 5) {
        // Position 5 is long break (after 3rd work session)
        this.session.sessionType = SessionType.LONG_BREAK;
        this.session.timeRemaining = this.config.longBreakDuration;
        this.session.totalTime = this.config.longBreakDuration;
      } else {
        // Even positions (2,4) are work sessions
        this.session.sessionType = SessionType.WORK;
        this.session.timeRemaining = this.config.workDuration;
        this.session.totalTime = this.config.workDuration;
      }
    } else {
      // Break completed, move to next in cycle
      this.currentCyclePosition++;
      
      if (this.currentCyclePosition === 6) {
        // After long break, restart cycle
        this.currentCyclePosition = 0;
      }
      
      this.session.sessionType = SessionType.WORK;
      this.session.timeRemaining = this.config.workDuration;
      this.session.totalTime = this.config.workDuration;
    }

    // After skip, set to PAUSED so user can decide when to start next session
    this.session.state = PomodoroState.PAUSED;
    
    // Emit sessionSkipped event (separate from sessionComplete to avoid notifications)
    this.emit('sessionSkipped', this.session);
    this.emit('stateChanged', this.session);
  }

  private getPreviousState(): PomodoroState {
    // When resuming from pause, determine the appropriate state
    if (this.session.completedPomodoros === 0) {
      return PomodoroState.WORK;
    }

    const isBreakTime =
      this.session.completedPomodoros % this.config.pomodorosBeforeLongBreak ===
      0;
    return isBreakTime ? PomodoroState.LONG_BREAK : PomodoroState.SHORT_BREAK;
  }
}
