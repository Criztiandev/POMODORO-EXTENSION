import * as vscode from 'vscode';
import { PomodoroSettings } from '../types';

export class SettingsManager {
  private static readonly SETTINGS_KEY = 'pomodoroTimer';
  
  private static defaultSettings: PomodoroSettings = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    hourFormat: true,
    notificationEnabled: true,
    notificationCount: 3,
    alarmVolume: 50
  };

  static getSettings(): PomodoroSettings {
    const config = vscode.workspace.getConfiguration(this.SETTINGS_KEY);
    
    return {
      workDuration: config.get('workDuration', this.defaultSettings.workDuration),
      shortBreakDuration: config.get('shortBreakDuration', this.defaultSettings.shortBreakDuration),
      longBreakDuration: config.get('longBreakDuration', this.defaultSettings.longBreakDuration),
      hourFormat: config.get('hourFormat', this.defaultSettings.hourFormat),
      notificationEnabled: config.get('notificationEnabled', this.defaultSettings.notificationEnabled),
      notificationCount: config.get('notificationCount', this.defaultSettings.notificationCount),
      alarmVolume: config.get('alarmVolume', this.defaultSettings.alarmVolume)
    };
  }

  static async updateSettings(settings: Partial<PomodoroSettings>): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.SETTINGS_KEY);
    
    for (const [key, value] of Object.entries(settings)) {
      await config.update(key, value, vscode.ConfigurationTarget.Global);
    }
  }

  static async resetToDefaults(): Promise<void> {
    await this.updateSettings(this.defaultSettings);
  }
}