import * as vscode from 'vscode';
import { Todo, TodoState } from '../types/todo.interface';

export class TodoManager {
  private static readonly TODO_KEY = 'pomodoroTodos';
  private static readonly MAX_TASKS = 50;
  private static instance: TodoManager;

  private state: TodoState = {
    tasks: [],
    currentTaskId: undefined,
  };

  private constructor() {
    this.loadState();
  }

  static getInstance(): TodoManager {
    if (!TodoManager.instance) {
      TodoManager.instance = new TodoManager();
    }
    return TodoManager.instance;
  }

  private loadState(): void {
    try {
      const config = vscode.workspace.getConfiguration('pomodoroTimer');
      const savedState = config.get<any>(TodoManager.TODO_KEY);

      if (savedState && savedState.tasks && Array.isArray(savedState.tasks)) {
        this.state = {
          tasks: savedState.tasks.map((task: any) => {
            // Handle both Date objects and ISO strings
            const createdAt =
              task.createdAt instanceof Date
                ? task.createdAt
                : new Date(task.createdAt);

            const completedAt = task.completedAt
              ? task.completedAt instanceof Date
                ? task.completedAt
                : new Date(task.completedAt)
              : undefined;

            return {
              ...task,
              createdAt,
              completedAt,
            };
          }),
          currentTaskId: savedState.currentTaskId,
        };

        this.cleanupCompletedTasks();
        this.ensureTaskLimit();
      } else {
        this.state = { tasks: [], currentTaskId: undefined };
      }
    } catch (error) {
      console.error('TodoManager: Failed to load state', error);
      this.state = { tasks: [], currentTaskId: undefined };
    }
  }

  private async saveState(): Promise<void> {
    try {
      const serializableState = {
        tasks: this.state.tasks.map((task) => ({
          ...task,
          createdAt: task.createdAt.toISOString(),
          completedAt: task.completedAt?.toISOString(),
        })),
        currentTaskId: this.state.currentTaskId,
      };

      const config = vscode.workspace.getConfiguration('pomodoroTimer');

      try {
        await config.update(
          TodoManager.TODO_KEY,
          serializableState,
          vscode.ConfigurationTarget.Workspace
        );
      } catch (workspaceError) {
        console.warn(
          'TodoManager: Workspace save failed, trying global',
          workspaceError
        );
        await config.update(
          TodoManager.TODO_KEY,
          serializableState,
          vscode.ConfigurationTarget.Global
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to save todos: ${errorMessage}`);
    }
  }

  private cleanupCompletedTasks(): void {
    const now = new Date();
    this.state.tasks = this.state.tasks.filter((task) => {
      if (!task.completed) {
        return true;
      }

      if (task.completedAt) {
        const daysSinceCompleted =
          (now.getTime() - task.completedAt.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceCompleted < 1;
      }

      return true;
    });
  }

  private ensureTaskLimit(): void {
    if (this.state.tasks.length > TodoManager.MAX_TASKS) {
      const sortedTasks = [...this.state.tasks].sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      this.state.tasks = sortedTasks.slice(0, TodoManager.MAX_TASKS);
    }
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createTask(
    title: string,
    description?: string,
    estimatedPomodoros?: number,
    estimatedMinutes?: number,
    priority?: 'low' | 'medium' | 'high'
  ): Promise<Todo> {
    if (!title || title.trim().length === 0) {
      throw new Error('Task title is required');
    }

    if (title.length > 100) {
      throw new Error('Task title must be 100 characters or less');
    }

    if (this.state.tasks.length >= TodoManager.MAX_TASKS) {
      throw new Error(`Maximum ${TodoManager.MAX_TASKS} tasks allowed`);
    }

    const task: Todo = {
      id: this.generateTaskId(),
      title: title.trim(),
      description: description?.trim(),
      estimatedPomodoros,
      estimatedMinutes,
      completed: false,
      createdAt: new Date(),
      priority,
    };

    this.state.tasks.push(task);

    if (!this.state.currentTaskId) {
      this.state.currentTaskId = task.id;
    }

    this.sortTasks();
    await this.saveState();
    return task;
  }

  async updateTask(
    taskId: string,
    updates: Partial<Omit<Todo, 'id' | 'createdAt' | 'completedAt'>>
  ): Promise<Todo> {
    const taskIndex = this.state.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    if (updates.title !== undefined) {
      if (!updates.title || updates.title.trim().length === 0) {
        throw new Error('Task title is required');
      }
      if (updates.title.length > 100) {
        throw new Error('Task title must be 100 characters or less');
      }
      updates.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      updates.description = updates.description?.trim();
    }

    const updatedTask = { ...this.state.tasks[taskIndex], ...updates };
    this.state.tasks[taskIndex] = updatedTask;

    await this.saveState();
    return updatedTask;
  }

  async completeTask(taskId: string): Promise<Todo> {
    const taskIndex = this.state.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    const updatedTask = {
      ...this.state.tasks[taskIndex],
      completed: true,
      completedAt: new Date(),
    };
    this.state.tasks[taskIndex] = updatedTask;

    this.sortTasks();

    if (this.state.currentTaskId === taskId) {
      const nextTask = this.state.tasks.find((t) => !t.completed);
      this.state.currentTaskId = nextTask?.id;
    }

    await this.saveState();
    return updatedTask;
  }

  async deleteTask(taskId: string): Promise<void> {
    const taskIndex = this.state.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    this.state.tasks.splice(taskIndex, 1);

    if (this.state.currentTaskId === taskId) {
      const nextTask = this.state.tasks.find((t) => !t.completed);
      this.state.currentTaskId = nextTask?.id;
    }

    await this.saveState();
  }

  async setCurrentTask(taskId: string): Promise<void> {
    const task = this.state.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.completed) {
      throw new Error('Cannot set completed task as current');
    }

    this.state.currentTaskId = taskId;

    this.sortTasks();
    await this.saveState();
  }

  async clearCurrentTask(): Promise<void> {
    this.state.currentTaskId = undefined;
    await this.saveState();
  }

  async clearAllTasks(): Promise<void> {
    this.state.tasks = [];
    this.state.currentTaskId = undefined;
    await this.saveState();
  }

  async clearCompletedTasks(): Promise<void> {
    this.state.tasks = this.state.tasks.filter((t) => !t.completed);
    console.log(this.state.tasks);
    await this.saveState();
  }

  private sortTasks(): void {
    this.state.tasks.sort((a, b) => {
      // Completed tasks always at the bottom
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      // Current task always at the top (among non-completed tasks)
      if (a.id === this.state.currentTaskId) {
        return -1;
      }
      if (b.id === this.state.currentTaskId) {
        return 1;
      }

      // For non-completed tasks: older tasks at top, newer at bottom (chronological order)
      // For completed tasks: most recently completed at top of completed section
      if (!a.completed && !b.completed) {
        return a.createdAt.getTime() - b.createdAt.getTime(); // Older first
      } else {
        return b.createdAt.getTime() - a.createdAt.getTime(); // Recent first for completed
      }
    });
  }

  getTasks(): Todo[] {
    return [...this.state.tasks];
  }

  getCurrentTask(): Todo | undefined {
    if (!this.state.currentTaskId) {
      return undefined;
    }
    return this.state.tasks.find((t) => t.id === this.state.currentTaskId);
  }

  getPendingTasks(): Todo[] {
    return this.state.tasks.filter((t) => !t.completed);
  }

  getCompletedTasks(): Todo[] {
    return this.state.tasks.filter((t) => t.completed);
  }

  getTodoState(): TodoState {
    return {
      tasks: [...this.state.tasks],
      currentTaskId: this.state.currentTaskId,
    };
  }

  dispose(): void {
    this.clearCompletedTasks().catch(console.error);
  }
}
