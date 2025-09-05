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

async function toggleTask(taskId, completed) {
  console.log('toggleTask called with:', taskId, completed);

  try {
    if (completed) {
      await messageHandler.sendRequest('completeTask', { taskId });
    } else {
      await messageHandler.sendRequest('updateTask', {
        taskId,
        updates: { completed: false },
      });
    }
  } catch (error) {
    console.error('Failed to toggle task:', error);
    // Rollback UI change
    const checkbox = document.querySelector(
      `[data-task-id="${taskId}"] .hidden-checkbox`
    );
    if (checkbox) {
      checkbox.checked = !completed;
    }
  }
}

async function selectTask(taskId) {
  console.log('selectTask called with:', taskId);
  if (isProcessingSelection) {
    return;
  }

  // Set processing flag immediately for instant feedback
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

      if (!isCurrentlySelected) {
        // INSTANT optimistic update - no delay
        taskRenderer.selectTaskInDOM(taskId);
        
        // Update current task display immediately
        const taskElement = selectedItem;
        const titleElement = taskElement.querySelector('.task-title');
        const descElement = taskElement.querySelector('.task-description');
        
        const currentTask = {
          id: taskId,
          title: titleElement?.textContent || '',
          description: descElement?.textContent || ''
        };
        updateCurrentTaskDisplay(currentTask);
        
        // Background sync with server
        try {
          await messageHandler.sendRequest('setCurrentTask', { taskId });
        } catch (error) {
          console.error('Failed to select task:', error);
          // Rollback on error
          taskRenderer.selectTaskInDOM(null);
          updateCurrentTaskDisplay(null);
        }
      } else {
        // INSTANT deselect - no delay
        taskRenderer.selectTaskInDOM(null);
        updateCurrentTaskDisplay(null);
        
        // Background sync with server
        try {
          await messageHandler.sendRequest('clearCurrentTask');
        } catch (error) {
          console.error('Failed to clear current task:', error);
          // Rollback on error
          taskRenderer.selectTaskInDOM(taskId);
          const currentTask = {
            id: taskId,
            title: selectedItem.querySelector('.task-title')?.textContent || '',
            description: selectedItem.querySelector('.task-description')?.textContent || ''
          };
          updateCurrentTaskDisplay(currentTask);
        }
      }
  } finally {
    // Reset processing flag after a short delay
    setTimeout(() => {
      isProcessingSelection = false;
    }, 100);
  }
}

function clearCurrentTaskDisplay() {
  // EJS template creates the working-on-display element, just hide it
  const workingOnDisplay = document.querySelector('.working-on-display');
  if (workingOnDisplay) {
    workingOnDisplay.style.display = 'none';
  }
}

async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) {
    return;
  }

  // Optimistic update - remove from DOM immediately
  taskRenderer.removeTaskFromDOM(taskId);

  try {
    await messageHandler.sendRequest('deleteTask', { taskId });
  } catch (error) {
    console.error('Failed to delete task:', error);
    // For now, trigger a full refresh on error
    vscode.postMessage({ command: 'refreshPanel' });
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

  // Handle AJAX-style responses first
  if (messageHandler.handleResponse(message)) {
    return; // Response handled, don't process further
  }

  // Handle targeted task events
  if (message.command === 'taskCreated' && message.task) {
    taskRenderer.addTaskToDOM(message.task, message.currentTaskId);
    if (message.currentTaskId === message.task.id) {
      updateCurrentTaskDisplay(message.task);
    }
    return;
  }

  if (message.command === 'taskDeleted' && message.taskId) {
    taskRenderer.removeTaskFromDOM(message.taskId);
    if (message.currentTaskId) {
      const currentTask = message.tasks?.find(
        (t) => t.id === message.currentTaskId
      );
      updateCurrentTaskDisplay(currentTask);
    } else {
      updateCurrentTaskDisplay(null);
    }
    return;
  }

  if (message.command === 'taskUpdated' && message.task) {
    taskRenderer.updateTaskInDOM(
      message.task.id,
      message.task,
      message.currentTaskId
    );
    if (message.currentTaskId === message.task.id) {
      updateCurrentTaskDisplay(message.task);
    }
    return;
  }

  if (message.command === 'taskSelected') {
    // Only update if not currently processing selection (to avoid overriding optimistic updates)
    if (!isProcessingSelection) {
      taskRenderer.selectTaskInDOM(message.taskId);
      const currentTask = message.tasks?.find((t) => t.id === message.taskId);
      updateCurrentTaskDisplay(currentTask);
    }
    return;
  }

  // Handle traditional timer updates (no todoState to prevent re-renders)
  if (message.command === 'updateSession') {
    debounce(
      'updateUI',
      () => {
        updateUI(message.session, message.isTimerActive);
        // todoState updates now handled by targeted events above
      },
      50
    );
  } else if (message.command === 'sessionComplete') {
    updateUI(message.session, false);
  } else if (message.command === 'updateTodos') {
    // Legacy full-state update - only used as fallback
    debounce(
      'updateTodos',
      () => {
        console.warn(
          'Using legacy full-state update - should use targeted events instead'
        );
        updateTodoUI(message.todoState);
      },
      100
    );
  } else if (message.command === 'cleanup') {
    cleanupManager.cleanup();
    messageHandler.cleanup();
  }
});

// =========================================================================
// ===== AJAX-Style Messaging System ======================================
// =========================================================================

// Request/Response messaging system for real-time updates
class MessageHandler {
  constructor() {
    this.pendingRequests = new Map();
    this.requestCounter = 0;
  }

  generateRequestId() {
    return `req_${Date.now()}_${++this.requestCounter}`;
  }

  sendRequest(command, data = {}) {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();

      // Store request promise handlers
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timestamp: Date.now(),
        command,
      });

      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error(`Request timeout for ${command}`));
        }
      }, 5000); // 5 second timeout

      // Send message to VSCode extension
      vscode.postMessage({
        command,
        requestId,
        ...data,
      });
    });
  }

  handleResponse(message) {
    const { requestId, success, data, error } = message;

    if (!requestId || !this.pendingRequests.has(requestId)) {
      return false; // Not a response to our request
    }

    const request = this.pendingRequests.get(requestId);
    this.pendingRequests.delete(requestId);

    if (success) {
      request.resolve(data);
    } else {
      request.reject(new Error(error || 'Request failed'));
    }

    return true; // Response handled
  }

  // Clean up old pending requests
  cleanup() {
    const now = Date.now();
    const timeout = 10000; // 10 seconds

    for (const [requestId, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > timeout) {
        request.reject(new Error(`Request timeout for ${request.command}`));
        this.pendingRequests.delete(requestId);
      }
    }
  }
}

// Global message handler instance
const messageHandler = new MessageHandler();

// Task Renderer for targeted DOM manipulation
class TaskRenderer {
  constructor() {
    this.taskListElement = null;
  }

  init() {
    this.taskListElement = document.getElementById('taskList');
    if (!this.taskListElement) {
      console.error('Task list element not found');
    }
  }

  createTaskElement(task, currentTaskId = null) {
    const isCurrent = task.id === currentTaskId && !task.completed;

    const taskDiv = document.createElement('div');
    taskDiv.className =
      `task-item ${task.completed ? 'completed' : ''} ${isCurrent ? 'current' : ''}`.trim();
    taskDiv.dataset.taskId = task.id;
    
    // Make entire task item clickable
    taskDiv.addEventListener('click', () => this.handleTaskSelect(task.id));

    // Create task main container
    const taskMain = document.createElement('div');
    taskMain.className = 'task-main';
    taskMain.style.cssText = 'display: flex; gap: 16px;';

    // Create circular checkbox container (matching EJS template)
    const checkboxContainer = document.createElement('label');
    checkboxContainer.className = 'circle-checkbox-container';
    checkboxContainer.addEventListener('click', (e) => e.stopPropagation());

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'hidden-checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () =>
      this.handleTaskToggle(task.id, checkbox.checked)
    );

    const checkmark = document.createElement('span');
    checkmark.className = 'checkmark';

    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(checkmark);

    // Create content div
    const contentDiv = document.createElement('div');
    contentDiv.className = 'task-content';

    // Create title
    const titleDiv = document.createElement('div');
    titleDiv.className =
      `task-title ${task.completed ? 'completed' : ''}`.trim();
    titleDiv.textContent = task.title;
    contentDiv.appendChild(titleDiv);

    // Add description if available
    if (task.description) {
      const descDiv = document.createElement('div');
      descDiv.className = 'task-description';
      descDiv.style.fontWeight = '400';
      descDiv.textContent = task.description;
      contentDiv.appendChild(descDiv);
    }

    // Add meta information if available
    if (task.estimatedPomodoros || task.estimatedMinutes) {
      const metaDiv = document.createElement('div');
      metaDiv.className = 'task-meta';

      let metaText = '';
      if (task.estimatedPomodoros) {
        metaText += `${task.estimatedPomodoros} pomodoros`;
      }
      if (task.estimatedMinutes) {
        metaText += `${metaText ? ' ' : ''}${task.estimatedMinutes} min`;
      }

      metaDiv.textContent = metaText;
      contentDiv.appendChild(metaDiv);
    }

    // Assemble task main
    taskMain.appendChild(checkboxContainer);
    taskMain.appendChild(contentDiv);

    // Create actions div
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'task-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-action-btn';
    deleteBtn.title = 'Delete Task';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleTaskDelete(task.id);
    });

    actionsDiv.appendChild(deleteBtn);

    // Assemble task element
    taskDiv.appendChild(taskMain);
    taskDiv.appendChild(actionsDiv);

    return taskDiv;
  }

  addTaskToDOM(task, currentTaskId = null) {
    if (!this.taskListElement) {
      return;
    }

    // Check if empty state exists and remove it
    const emptyState = this.taskListElement.querySelector('.empty-state');
    if (emptyState) {
      emptyState.remove();
    }

    const taskElement = this.createTaskElement(task, currentTaskId);

    // Add with animation
    taskElement.style.opacity = '0';
    taskElement.style.transform = 'translateY(-10px)';
    this.taskListElement.appendChild(taskElement);

    this.updateTodoActionsVisibility();
  }

  removeTaskFromDOM(taskId) {
    const taskElement = this.taskListElement?.querySelector(
      `[data-task-id="${taskId}"]`
    );
    if (!taskElement) {
      return;
    }

    setTimeout(() => {
      taskElement.remove();
      this.checkForEmptyState();
      this.updateTodoActionsVisibility();
    }, 300);
  }

  updateTaskInDOM(taskId, updates, currentTaskId = null) {
    const taskElement = this.taskListElement?.querySelector(
      `[data-task-id="${taskId}"]`
    );
    if (!taskElement) {
      return;
    }

    // Update classes
    const isCurrent = taskId === currentTaskId && !updates.completed;
    taskElement.className =
      `task-item ${updates.completed ? 'completed' : ''} ${isCurrent ? 'current' : ''}`.trim();

    // Update checkbox
    const checkbox = taskElement.querySelector('.hidden-checkbox');
    if (checkbox && updates.completed !== undefined) {
      checkbox.checked = updates.completed;
    }

    // Update title
    if (updates.title) {
      const titleElement = taskElement.querySelector('.task-title');
      if (titleElement) {
        titleElement.textContent = updates.title;
        titleElement.className =
          `task-title ${updates.completed ? 'completed' : ''}`.trim();
      }
    }

    // Update description
    if (updates.description !== undefined) {
      let descElement = taskElement.querySelector('.task-description');
      if (updates.description) {
        if (!descElement) {
          // Create description element
          descElement = document.createElement('div');
          descElement.className = 'task-description';
          descElement.style.fontWeight = '400';
          const contentDiv = taskElement.querySelector('.task-content');
          const titleDiv = contentDiv.querySelector('.task-title');
          contentDiv.insertBefore(descElement, titleDiv.nextSibling);
        }
        descElement.textContent = updates.description;
        descElement.style.display = 'block';
      } else if (descElement) {
        descElement.remove();
      }
    }
  }

  selectTaskInDOM(taskId) {
    // Remove current selection
    this.taskListElement
      ?.querySelectorAll('.task-item.current')
      .forEach((item) => {
        item.classList.remove('current');
      });

    // Add new selection
    if (taskId) {
      const taskElement = this.taskListElement?.querySelector(
        `[data-task-id="${taskId}"]`
      );
      if (taskElement) {
        taskElement.classList.add('current');
      }
    }
  }

  checkForEmptyState() {
    if (!this.taskListElement) {
      return;
    }

    const taskItems = this.taskListElement.querySelectorAll('.task-item');
    if (taskItems.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.textContent =
        'No tasks yet. Create your first task to get started! 🎯';
      this.taskListElement.appendChild(emptyState);
    }
  }

  updateTodoActionsVisibility() {
    const todoActions = document.querySelector('.todo-actions');
    const hasActiveTasks =
      this.taskListElement?.querySelectorAll('.task-item').length > 0;

    if (todoActions) {
      todoActions.style.display = hasActiveTasks ? 'block' : 'none';
    }
  }

  // Event handlers that will use the message system
  async handleTaskToggle(taskId, completed) {
    try {
      if (completed) {
        await messageHandler.sendRequest('completeTask', { taskId });
      } else {
        await messageHandler.sendRequest('updateTask', {
          taskId,
          updates: { completed: false },
        });
      }
    } catch (error) {
      console.error('Failed to toggle task:', error);
      // Rollback UI change
      const checkbox = this.taskListElement?.querySelector(
        `[data-task-id="${taskId}"] .hidden-checkbox`
      );
      if (checkbox) {
        checkbox.checked = !completed;
      }
    }
  }

  async handleTaskSelect(taskId) {
    // Optimistic update
    this.selectTaskInDOM(taskId);

    try {
      await messageHandler.sendRequest('setCurrentTask', { taskId });
    } catch (error) {
      console.error('Failed to select task:', error);
      // Could implement more sophisticated rollback here
    }
  }

  async handleTaskDelete(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    // Optimistic update
    this.removeTaskFromDOM(taskId);

    try {
      await messageHandler.sendRequest('deleteTask', { taskId });
    } catch (error) {
      console.error('Failed to delete task:', error);
      // Would need to restore the task element here
      // For now, let's trigger a full refresh
      vscode.postMessage({ command: 'refreshPanel' });
    }
  }
}

// Global task renderer instance
const taskRenderer = new TaskRenderer();

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
  taskRenderer.init();

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

  // Clean up pending requests periodically
  setInterval(() => {
    messageHandler.cleanup();
  }, 30000); // Every 30 seconds
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Form submission handling with AJAX-style updates
document
  .getElementById('createTaskForm')
  .addEventListener('submit', async function (e) {
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

    try {
      // Use the new AJAX-style messaging
      const result = await messageHandler.sendRequest('createTask', { task });

      // Task will be added to DOM via the 'taskCreated' event
      hideCreateTaskModal();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    }
  });
