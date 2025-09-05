import * as vscode from 'vscode';
import { PomodoroSettings } from '../types';

export class SettingsManager {
  private static readonly SETTINGS_KEY = 'pomodoroTimer';
  
  private static defaultSettings: PomodoroSettings = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    hourFormat: true,
    notificationEnabled: true
  };

  static getSettings(): PomodoroSettings {
    const config = vscode.workspace.getConfiguration(this.SETTINGS_KEY);
    
    return {
      workDuration: config.get('workDuration', this.defaultSettings.workDuration),
      shortBreakDuration: config.get('shortBreakDuration', this.defaultSettings.shortBreakDuration),
      longBreakDuration: config.get('longBreakDuration', this.defaultSettings.longBreakDuration),
      hourFormat: config.get('hourFormat', this.defaultSettings.hourFormat),
      notificationEnabled: config.get('notificationEnabled', this.defaultSettings.notificationEnabled)
    };
  }

  static validateSettings(settings: Partial<PomodoroSettings>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.workDuration !== undefined) {
      if (!Number.isInteger(settings.workDuration) || settings.workDuration < 1 || settings.workDuration > 60) {
        errors.push('Work duration must be between 1 and 60 minutes');
      }
    }

    if (settings.shortBreakDuration !== undefined) {
      if (!Number.isInteger(settings.shortBreakDuration) || settings.shortBreakDuration < 1 || settings.shortBreakDuration > 30) {
        errors.push('Short break duration must be between 1 and 30 minutes');
      }
    }

    if (settings.longBreakDuration !== undefined) {
      if (!Number.isInteger(settings.longBreakDuration) || settings.longBreakDuration < 1 || settings.longBreakDuration > 60) {
        errors.push('Long break duration must be between 1 and 60 minutes');
      }
    }


    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static async updateSettings(settings: Partial<PomodoroSettings>): Promise<void> {
    try {
      console.log('SettingsManager: Updating settings', settings);

      const validation = this.validateSettings(settings);
      if (!validation.isValid) {
        const errorMessage = `Invalid settings: ${validation.errors.join(', ')}`;
        console.error('SettingsManager: Validation failed', errorMessage);
        throw new Error(errorMessage);
      }

      const config = vscode.workspace.getConfiguration(this.SETTINGS_KEY);
      
      for (const [key, value] of Object.entries(settings)) {
        console.log(`SettingsManager: Setting ${key} = ${value}`);
        await config.update(key, value, vscode.ConfigurationTarget.Global);
      }

      console.log('SettingsManager: Settings updated successfully');
    } catch (error) {
      console.error('SettingsManager: Failed to update settings', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to update settings: ${errorMessage}`);
    }
  }

  static async resetToDefaults(): Promise<void> {
    await this.updateSettings(this.defaultSettings);
  }
}