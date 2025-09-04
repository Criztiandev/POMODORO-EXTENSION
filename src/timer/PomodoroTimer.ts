import { EventEmitter } from 'events';
import { PomodoroState, PomodoroSession, PomodoroConfig } from '../types';

export class PomodoroTimer extends EventEmitter {
  private session: PomodoroSession;
  private config: PomodoroConfig;
  private timer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<PomodoroConfig>) {
    super();

    this.config = {
      workDuration: 25 * 60 * 1000, // 25 minutes
      shortBreakDuration: 5 * 60 * 1000, // 5 minutes
      longBreakDuration: 15 * 60 * 1000, // 15 minutes
      pomodorosBeforeLongBreak: 4,
      ...config,
    };

    this.session = {
      state: PomodoroState.IDLE,
      timeRemaining: this.config.workDuration,
      totalTime: this.config.workDuration,
      completedPomodoros: 0,
    };
  }

  start(): void {
    if (this.session.state === PomodoroState.IDLE) {
      // First time starting - always go to work
      this.session.state = PomodoroState.WORK;
      this.session.timeRemaining = this.config.workDuration;
      this.session.totalTime = this.config.workDuration;
    } else if (this.session.state === PomodoroState.PAUSED) {
      // Resuming from pause - determine what state to resume to
      if (this.session.completedPomodoros === 0) {
        this.session.state = PomodoroState.WORK;
      } else {
        this.session.state = this.getPreviousState();
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

    this.session = {
      state: PomodoroState.PAUSED,
      timeRemaining: this.config.workDuration,
      totalTime: this.config.workDuration,
      completedPomodoros: this.session.completedPomodoros,
    };

    this.emit('stateChanged', this.session);
  }

  skip(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.handleSessionSkip();
  }

  getSession(): PomodoroSession {
    return { ...this.session };
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

    if (this.session.state === PomodoroState.WORK) {
      this.session.completedPomodoros++;
      const isLongBreak =
        this.session.completedPomodoros %
          this.config.pomodorosBeforeLongBreak ===
        0;

      this.session.state = isLongBreak
        ? PomodoroState.LONG_BREAK
        : PomodoroState.SHORT_BREAK;
      this.session.timeRemaining = isLongBreak
        ? this.config.longBreakDuration
        : this.config.shortBreakDuration;
      this.session.totalTime = this.session.timeRemaining;
    } else {
      this.session.state = PomodoroState.WORK;
      this.session.timeRemaining = this.config.workDuration;
      this.session.totalTime = this.config.workDuration;
    }

    // Set to paused after session completes - user must click to continue
    this.session.state = PomodoroState.PAUSED;
    this.emit('sessionComplete', this.session);
    this.emit('stateChanged', this.session);
  }

  private handleSessionSkip(): void {
    if (this.session.state === PomodoroState.WORK) {
      this.session.completedPomodoros++;
      const isLongBreak =
        this.session.completedPomodoros %
          this.config.pomodorosBeforeLongBreak ===
        0;

      this.session.state = isLongBreak
        ? PomodoroState.LONG_BREAK
        : PomodoroState.SHORT_BREAK;
      this.session.timeRemaining = isLongBreak
        ? this.config.longBreakDuration
        : this.config.shortBreakDuration;
      this.session.totalTime = this.session.timeRemaining;
    } else {
      this.session.state = PomodoroState.WORK;
      this.session.timeRemaining = this.config.workDuration;
      this.session.totalTime = this.config.workDuration;
    }

    // After skip, return to start state (IDLE shows "Start")
    this.session.state = PomodoroState.IDLE;
    this.emit('sessionComplete', this.session);
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
