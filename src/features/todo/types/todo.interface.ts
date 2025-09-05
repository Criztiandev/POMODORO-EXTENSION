export interface Todo {
  id: string;
  title: string;
  description?: string;
  estimatedPomodoros?: number;
  estimatedMinutes?: number;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
  priority?: 'low' | 'medium' | 'high';
}

export interface TodoState {
  tasks: Todo[];
  currentTaskId?: string;
}
