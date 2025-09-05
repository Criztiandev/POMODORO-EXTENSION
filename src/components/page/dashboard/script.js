const vscode = acquireVsCodeApi();

// =========================================================================
// ===== VSCode API Communication Layer ===================================
// =========================================================================

function toggleTimer() {
  vscode.postMessage({
    command: 'toggleTimer',
  });
}

function skip() {
  vscode.postMessage({
    command: 'skip',
  });
}

function showSettings() {
  vscode.postMessage({
    command: 'showSettings',
  });
}

function selectTab(type) {
  vscode.postMessage({
    command: 'switchSession',
    sessionType: type,
  });
}

// =========================================================================
// ===== Timer Management Module ==========================================
// =========================================================================

function formatTime(milliseconds) {
  const minutes = Math.floor(milliseconds / 60000);
  const seconds = Math.floor((milliseconds % 60000) / 1000);
  return (
    minutes.toString().padStart(2, '0') +
    ':' +
    seconds.toString().padStart(2, '0')
  );
}

function updateUI(session, isTimerActive = false) {
  // Update timer display
  const timerDisplay = domCache.getByClass('timer-display');
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(session.timeRemaining);
  }

  // Update tabs active state - use sessionType instead of state
  document
    .querySelectorAll('.tab')
    .forEach((tab) => tab.classList.remove('active'));
  if (session.sessionType === 'work') {
    document.querySelector('.tab:nth-child(1)').classList.add('active');
  } else if (session.sessionType === 'shortBreak') {
    document.querySelector('.tab:nth-child(2)').classList.add('active');
  } else if (session.sessionType === 'longBreak') {
    document.querySelector('.tab:nth-child(3)').classList.add('active');
  }

  // Update button text - fix the logic for skip vs pause
  const controlBtn = document.querySelector('.control-btn');
  if (controlBtn) {
    let buttonText;
    if (session.state === 'idle') {
      buttonText = 'Start';
    } else if (isTimerActive) {
      buttonText = 'Pause';
    } else if (session.state === 'paused') {
      // Check if we just skipped or truly paused
      // After skip, we want "Start", after pause we want "Resume"
      // We'll determine this by checking if timer was just skipped
      buttonText = 'Start'; // Always show Start after skip/pause for now
    } else {
      buttonText = 'Start';
    }
    controlBtn.textContent = buttonText;
  }

  // Update skip button state
  const skipBtn = document.querySelector('.control-btn.secondary');
  if (skipBtn) {
    if (isTimerActive) {
      skipBtn.classList.remove('disabled');
      skipBtn.removeAttribute('disabled');
    } else {
      skipBtn.classList.add('disabled');
      skipBtn.setAttribute('disabled', 'true');
    }
  }

  // Update session info
  const sessionInfo = document.querySelector('.session-info');
  if (sessionInfo) {
    sessionInfo.textContent =
      'Completed Pomodoros: ' + session.completedPomodoros;
  }
}

// =========================================================================
// ===== Modal Management Module ==========================================
// =========================================================================

// Modal management with proper focus handling
let isModalOpen = false;
let previousFocus = null;

function showCreateTaskModal() {
  const modal = domCache.getById('createTaskModal');
  const taskTitle = domCache.getById('taskTitle');

  if (!modal || !taskTitle) {
    console.error('Modal elements not found');
    return;
  }

  // Store the currently focused element
  previousFocus = document.activeElement;

  // Show modal
  modal.style.display = 'flex';
  isModalOpen = true;

  // Focus management
  setTimeout(() => {
    taskTitle.focus();
    taskTitle.select();
  }, 50);

  // Add modal overlay click handler
  modal.addEventListener('click', handleModalOverlayClick, {
    once: true,
  });
}

function hideCreateTaskModal() {
  const modal = domCache.getById('createTaskModal');
  const form = domCache.getById('createTaskForm');

  if (!modal || !form) {
    console.error('Modal elements not found');
    return;
  }

  // Hide modal
  modal.style.display = 'none';
  isModalOpen = false;

  // Reset form
  form.reset();
  domCache.getById('taskEstimateValue').style.display = 'none';
  domCache.getById('titleCounter').textContent = '0';

  // Restore focus to previous element
  if (previousFocus && typeof previousFocus.focus === 'function') {
    previousFocus.focus();
  }

  previousFocus = null;
}

function handleModalOverlayClick(event) {
  // Close modal if clicking on overlay (not on modal content)
  if (event.target.id === 'createTaskModal') {
    hideCreateTaskModal();
  }
}

// =========================================================================
// ===== Todo/Task Management Module ======================================
// =========================================================================

// Debounce mechanism for task selection to prevent rapid clicks
let selectTaskTimeout = null;
let isProcessingSelection = false;

function toggleTask(taskId, completed) {
  console.log('toggleTask called with:', taskId, completed);

  if (completed) {
    vscode.postMessage({
      command: 'completeTask',
      taskId: taskId,
    });
  } else {
    vscode.postMessage({
      command: 'updateTask',
      taskId: taskId,
      updates: { completed: false },
    });
  }
}

function selectTask(taskId) {
  console.log('selectTask called with:', taskId);
  if (isProcessingSelection) {
    return;
  }

  if (selectTaskTimeout) {
    clearTimeout(selectTaskTimeout);
  }

  // Set processing flag and debounce the action
  selectTaskTimeout = setTimeout(() => {
    isProcessingSelection = true;

    try {
      // Check if clicking on already selected task should deselect it
      const selectedItem = document.querySelector(`[data-task-id="${taskId}"]`);

      // Add null check for selectedItem
      if (!selectedItem) {
        console.error('No element found with data-task-id:', taskId);
        return;
      }

      const isCurrentlySelected = selectedItem.classList.contains('current');

      console.log('taskId:', taskId);
      console.log('isCurrentlySelected:', isCurrentlySelected);
      console.log('selectedItem:', selectedItem);

      // Clear all selections for clean state
      document.querySelectorAll('.task-item').forEach((item) => {
        item.classList.remove('current');
      });

      if (!isCurrentlySelected) {
        // Select new task
        selectedItem.classList.add('current');
        vscode.postMessage({
          command: 'setCurrentTask',
          taskId: taskId,
        });
      } else {
        // Deselect current task - clear UI displays immediately
        clearCurrentTaskDisplay();
        vscode.postMessage({
          command: 'clearCurrentTask',
        });
      }
    } finally {
      // Reset processing flag after a short delay to allow backend processing
      setTimeout(() => {
        isProcessingSelection = false;
      }, 100);
    }
  }, 200); // 200ms debounce delay
}

function clearCurrentTaskDisplay() {
  // EJS template creates the working-on-display element, just hide it
  const workingOnDisplay = document.querySelector('.working-on-display');
  if (workingOnDisplay) {
    workingOnDisplay.style.display = 'none';
  }
}

function deleteTask(taskId) {
  if (confirm('Are you sure you want to delete this task?')) {
    vscode.postMessage({
      command: 'deleteTask',
      taskId: taskId,
    });
  }
}

function clearCompletedTasks() {
  vscode.postMessage({
    command: 'clearCompletedTasks',
  });
}

function clearAllTasks() {
  vscode.postMessage({
    command: 'clearAllTasks',
  });
}

// =========================================================================
// ===== UI/DOM Management Module =========================================
// =========================================================================

// Enhanced DOM element caching system
class DOMCache {
  constructor() {
    this.cache = new Map();
    this.initialized = false;
  }

  get(selector) {
    if (!this.cache.has(selector)) {
      const element = document.querySelector(selector);
      if (element) {
        this.cache.set(selector, element);
      }
      return element;
    }
    return this.cache.get(selector);
  }

  getById(id) {
    const selector = `#${id}`;
    return this.get(selector);
  }

  getByClass(className) {
    const selector = `.${className}`;
    return this.get(selector);
  }

  invalidate(selector) {
    if (selector) {
      this.cache.delete(selector);
    } else {
      this.cache.clear();
    }
  }

  // Batch initialize commonly used elements
  init() {
    if (this.initialized) {
      return;
    }

    // Pre-cache critical elements
    const criticalSelectors = [
      '#taskList',
      '#createTaskModal',
      '#createTaskForm',
      '#taskTitle',
      '#titleCounter',
      '#taskEstimateValue',
      '.timer-display',
      '.session-info',
      '.working-on-display',
      '.current-task',
      '.todo-actions',
    ];

    criticalSelectors.forEach((selector) => this.get(selector));
    this.initialized = true;
  }
}

const domCache = new DOMCache();

// Track previous state to avoid unnecessary updates
let previousState = {
  currentTaskId: null,
  taskCount: 0,
  tasksHash: '',
};

function updateTodoUI(todoState) {
  console.log('updateTodoUI called with:', todoState);

  // Validate todoState before proceeding
  if (!todoState || !Array.isArray(todoState.tasks)) {
    console.warn('Invalid todoState provided to updateTodoUI');
    return;
  }

  // Quick hash to detect if tasks actually changed
  const tasksHash = todoState.tasks
    .map((t) => `${t.id}-${t.completed}-${t.title}`)
    .join('|');
  const hasTasksChanged = tasksHash !== previousState.tasksHash;
  const hasCurrentTaskChanged =
    todoState.currentTaskId !== previousState.currentTaskId;

  // Skip expensive updates if nothing changed
  if (!hasTasksChanged && !hasCurrentTaskChanged) {
    return;
  }

  // Find current task with validation
  const currentTask = todoState.currentTaskId
    ? todoState.tasks.find(
        (t) => t.id === todoState.currentTaskId && !t.completed
      )
    : null;

  // Only update current task display if it changed
  if (hasCurrentTaskChanged) {
    updateCurrentTaskDisplay(currentTask);
  }

  // Only update task list if tasks changed
  if (hasTasksChanged) {
    updateTaskList(todoState);
  }

  // Update previous state
  previousState = {
    currentTaskId: todoState.currentTaskId,
    taskCount: todoState.tasks.length,
    tasksHash: tasksHash,
  };
}

function updateCurrentTaskDisplay(currentTask) {
  // EJS template already creates the working-on-display element
  // We just need to update its content and visibility
  const workingOnDisplay = document.querySelector('.working-on-display');

  if (currentTask && !currentTask.completed) {
    if (workingOnDisplay) {
      const taskSpan = workingOnDisplay.querySelector('span');
      if (taskSpan) {
        taskSpan.textContent = currentTask.title;
      }
      workingOnDisplay.style.display = 'block';
    }
  } else {
    if (workingOnDisplay) {
      workingOnDisplay.style.display = 'none';
    }
  }
}

function updateTaskList(todoState) {
  // The EJS template already handles rendering the task list
  // We just need to update the existing elements with current state

  const taskItems = document.querySelectorAll('.task-item');
  taskItems.forEach((item) => {
    const taskId = item.dataset.taskId;
    const task = todoState.tasks.find((t) => t.id === taskId);

    if (task) {
      // Update task state classes
      item.className =
        `task-item ${task.completed ? 'completed' : ''} ${task.id === todoState.currentTaskId ? 'current' : ''}`.trim();

      // Update checkbox state
      const checkbox = item.querySelector('.hidden-checkbox');
      if (checkbox) {
        checkbox.checked = task.completed;
      }
    }
  });

  // Update todo actions visibility
  const todoActions = domCache.getByClass('todo-actions');
  if (todoActions) {
    todoActions.style.display = todoState.tasks.length > 0 ? 'block' : 'none';
  }
}

// =========================================================================
// ===== Event Handling Module ============================================
// =========================================================================

// Initialize DOM cache and add debouncing
let debounceTimers = new Map();

function debounce(key, func, delay = 100) {
  if (debounceTimers.has(key)) {
    clearTimeout(debounceTimers.get(key));
  }

  const timer = setTimeout(() => {
    func();
    debounceTimers.delete(key);
  }, delay);

  debounceTimers.set(key, timer);
}

// Enhanced keyboard shortcuts and navigation
document.addEventListener('keydown', function (e) {
  // ESC key handling
  if (e.key === 'Escape') {
    if (isModalOpen) {
      e.preventDefault();
      hideCreateTaskModal();
      return;
    }
  }

  // Enter key in modal
  if (e.key === 'Enter' && isModalOpen) {
    const activeElement = document.activeElement;
    // Only handle Enter if not in textarea or already on submit button
    if (
      activeElement &&
      activeElement.tagName !== 'TEXTAREA' &&
      activeElement.type !== 'submit'
    ) {
      const form = document.getElementById('createTaskForm');
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        e.preventDefault();
        submitBtn.click();
      }
    }
  }

  // Tab trap within modal
  if (e.key === 'Tab' && isModalOpen) {
    const modal = document.getElementById('createTaskModal');
    const focusableElements = modal.querySelectorAll(
      'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), select:not([disabled])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
});

// Listen for messages from extension
window.addEventListener('message', (event) => {
  const message = event.data;
  if (message.command === 'updateSession') {
    debounce(
      'updateUI',
      () => {
        updateUI(message.session, message.isTimerActive);
        if (message.todoState) {
          updateTodoUI(message.todoState);
        }
      },
      50
    );
  } else if (message.command === 'sessionComplete') {
    updateUI(message.session, false);
  } else if (message.command === 'updateTodos') {
    debounce(
      'updateTodos',
      () => {
        updateTodoUI(message.todoState);
      },
      100
    );
  } else if (message.command === 'cleanup') {
    cleanupManager.cleanup();
  }
});

// =========================================================================
// ===== Utility Functions ================================================
// =========================================================================

// Cleanup system for memory optimization
class CleanupManager {
  constructor() {
    this.eventListeners = new Set();
    this.intervals = new Set();
    this.timeouts = new Set();
  }

  addEventListener(element, event, handler, options) {
    const wrappedHandler = (e) => handler.call(element, e);
    element.addEventListener(event, wrappedHandler, options);
    this.eventListeners.add({
      element,
      event,
      handler: wrappedHandler,
      options,
    });
    return wrappedHandler;
  }

  addInterval(callback, delay) {
    const id = setInterval(callback, delay);
    this.intervals.add(id);
    return id;
  }

  addTimeout(callback, delay) {
    const id = setTimeout(callback, delay);
    this.timeouts.add(id);
    return id;
  }

  cleanup() {
    // Remove event listeners
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      if (element && typeof element.removeEventListener === 'function') {
        element.removeEventListener(event, handler, options);
      }
    });
    this.eventListeners.clear();

    // Clear intervals
    this.intervals.forEach((id) => clearInterval(id));
    this.intervals.clear();

    // Clear timeouts
    this.timeouts.forEach((id) => clearTimeout(id));
    this.timeouts.clear();

    // Clear debounce timers
    debounceTimers.forEach((timer) => clearTimeout(timer));
    debounceTimers.clear();

    // Clear DOM cache
    domCache.invalidate();
  }
}

const cleanupManager = new CleanupManager();

// Handle page unload for cleanup
window.addEventListener('beforeunload', () => {
  cleanupManager.cleanup();
});

// Handle webview disposal
window.addEventListener('unload', () => {
  cleanupManager.cleanup();
});

// =========================================================================
// ===== Application Initialization =======================================
// =========================================================================

// Initialize everything when DOM is ready
function initializeApp() {
  domCache.init();

  // Form handling with debounced input
  const titleInput = domCache.getById('taskTitle');
  const titleCounter = domCache.getById('titleCounter');
  const estimateType = domCache.getById('taskEstimateType');
  const estimateValue = domCache.getById('taskEstimateValue');

  if (titleInput && titleCounter) {
    titleInput.addEventListener('input', function () {
      debounce(
        'titleCounter',
        () => {
          titleCounter.textContent = this.value.length;
        },
        50
      );
    });
  }

  if (estimateType && estimateValue) {
    estimateType.addEventListener('change', function () {
      if (this.value === 'none') {
        estimateValue.style.display = 'none';
        estimateValue.value = '';
      } else {
        estimateValue.style.display = 'block';
        estimateValue.placeholder =
          this.value === 'pomodoros' ? 'Number of pomodoros' : 'Minutes';
        estimateValue.max = this.value === 'pomodoros' ? '20' : '480';
      }
    });
  }
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Form submission handling
document
  .getElementById('createTaskForm')
  .addEventListener('submit', function (e) {
    e.preventDefault();

    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const estimateType = document.getElementById('taskEstimateType').value;
    const estimateValue = parseInt(
      document.getElementById('taskEstimateValue').value
    );

    if (!title) {
      alert('Task title is required');
      return;
    }

    const task = {
      title: title,
      description: description || undefined,
    };

    if (estimateType === 'pomodoros' && estimateValue > 0) {
      task.estimatedPomodoros = estimateValue;
    } else if (estimateType === 'minutes' && estimateValue > 0) {
      task.estimatedMinutes = estimateValue;
    }

    vscode.postMessage({
      command: 'createTask',
      task: task,
    });

    hideCreateTaskModal();
  });
