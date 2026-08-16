/* ==========================================================================
   GreenLife - Screen 3: Task Management (tasks.js)
   Tabs (Today, Upcoming, Completed), Priority Badges, Add/Edit/Delete Tasks
   ========================================================================== */

const TasksView = {
  currentEditTaskId: null,

  render() {
    const container = document.getElementById('screen-tasks');
    if (!container) return;

    const todayStr = Utils.formatDate(new Date());
    let filteredTasks = [...AppState.tasks];

    // Search filter
    if (AppState.taskSearch && AppState.taskSearch.trim().length > 0) {
      const q = AppState.taskSearch.toLowerCase();
      filteredTasks = filteredTasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q)) ||
          (t.category && t.category.toLowerCase().includes(q))
      );
    }

    // Tab filter
    if (AppState.taskFilter === 'today') {
      filteredTasks = filteredTasks.filter((t) => t.date === todayStr && !t.completed);
    } else if (AppState.taskFilter === 'upcoming') {
      filteredTasks = filteredTasks.filter((t) => t.date > todayStr && !t.completed);
    } else if (AppState.taskFilter === 'completed') {
      filteredTasks = filteredTasks.filter((t) => t.completed);
    }

    // Sort by priority (High -> Medium -> Low)
    const priorityWeight = { High: 3, Medium: 2, Low: 1 };
    filteredTasks.sort((a, b) => (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1));

    const todayCount = AppState.tasks.filter((t) => t.date === todayStr && !t.completed).length;
    const upcomingCount = AppState.tasks.filter((t) => t.date > todayStr && !t.completed).length;
    const completedCount = AppState.tasks.filter((t) => t.completed).length;

    container.innerHTML = `
      <!-- Screen Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text);">My Tasks</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Organize high-impact daily goals & training</p>
        </div>
        <button class="btn-primary" id="tasks-add-new-btn" style="width: auto; padding: 10px 18px; margin: 0; font-size: 0.9rem;">
          + Add Task
        </button>
      </div>

      <!-- Search Box -->
      <div class="search-input-wrapper" style="margin-bottom: 16px;">
        <span class="search-icon">🔍</span>
        <input 
          type="text" 
          class="search-input" 
          id="task-search-input" 
          placeholder="Search tasks..." 
          value="${AppState.taskSearch || ''}"
        />
      </div>

      <!-- Task Tab Navigation -->
      <div class="tasks-tab-nav">
        <button class="task-nav-btn ${AppState.taskFilter === 'today' ? 'active' : ''}" data-tab="today">
          Today (${todayCount})
        </button>
        <button class="task-nav-btn ${AppState.taskFilter === 'upcoming' ? 'active' : ''}" data-tab="upcoming">
          Upcoming (${upcomingCount})
        </button>
        <button class="task-nav-btn ${AppState.taskFilter === 'completed' ? 'active' : ''}" data-tab="completed">
          Done (${completedCount})
        </button>
      </div>

      <!-- Tasks List -->
      <div class="tasks-list">
        ${
          filteredTasks.length === 0
            ? `<div class="card" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <div style="font-size: 2.2rem; margin-bottom: 10px;">📋</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: var(--text); margin-bottom: 6px;">No ${AppState.taskFilter} tasks</div>
                <p style="font-size: 0.85rem; margin-bottom: 16px;">${
                  AppState.taskFilter === 'completed'
                    ? 'Complete tasks from Today or Upcoming to see them here.'
                    : 'Stay ahead of your goals by adding a new task.'
                }</p>
                ${
                  AppState.taskFilter !== 'completed'
                    ? `<button class="btn-primary" style="max-width: 180px; margin: 0 auto;" id="task-empty-add-btn">+ Add Task</button>`
                    : ''
                }
              </div>`
            : filteredTasks
                .map(
                  (task) => `
            <div class="task-card ${task.completed ? 'completed' : ''}" data-task-id="${task.taskId}">
              <button class="task-checkbox-btn task-check-trigger" data-id="${task.taskId}" aria-label="Toggle task status">
                ${task.completed ? '✓' : ''}
              </button>
              
              <div class="task-content">
                <div class="task-title">${task.title}</div>
                ${task.description ? `<div class="task-desc">${task.description}</div>` : ''}
                <div class="task-badges">
                  <span class="priority-badge priority-${(task.priority || 'medium').toLowerCase()}">${task.priority || 'Medium'}</span>
                  <span class="task-time-badge">⏰ ${task.time || 'Anytime'}</span>
                  <span class="task-time-badge">📅 ${Utils.formatDisplayDate(task.date)}</span>
                  ${task.category ? `<span class="habit-badge">${task.category}</span>` : ''}
                </div>
              </div>

              <div class="habit-mgmt-actions">
                <button class="icon-btn task-edit-btn" data-id="${task.taskId}" title="Edit task">✏️</button>
                <button class="icon-btn task-delete-btn" data-id="${task.taskId}" title="Delete task" style="color: var(--accent-red);">🗑️</button>
              </div>
            </div>
          `
                )
                .join('')
        }
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    // Add task buttons
    const addBtn = document.getElementById('tasks-add-new-btn');
    if (addBtn) addBtn.addEventListener('click', () => this.openAddTaskModal());

    const emptyAdd = document.getElementById('task-empty-add-btn');
    if (emptyAdd) emptyAdd.addEventListener('click', () => this.openAddTaskModal());

    // Search input
    const searchInput = document.getElementById('task-search-input');
    if (searchInput) {
      searchInput.addEventListener(
        'input',
        Utils.debounce((e) => {
          AppState.taskSearch = e.target.value;
          this.render();
        }, 200)
      );
    }

    // Tab buttons
    document.querySelectorAll('.task-nav-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        AppState.taskFilter = e.currentTarget.dataset.tab;
        this.render();
      });
    });

    // Toggle checkboxes
    document.querySelectorAll('.task-check-trigger').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const rect = e.currentTarget.getBoundingClientRect();
        Utils.triggerConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        AppState.toggleTask(id);
        this.render();
      });
    });

    // Edit button
    document.querySelectorAll('.task-edit-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.openEditTaskModal(id);
      });
    });

    // Delete button
    document.querySelectorAll('.task-delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const task = AppState.tasks.find((t) => t.taskId === id);
        if (task) {
          UI.showConfirm(`Delete task "${task.title}"?`, 'This task will be permanently removed.', async () => {
            await API.deleteTask(id, AppState.currentUser);
            AppState.tasks = AppState.tasks.filter((t) => t.taskId !== id);
            AppState.recalculateStats();
            UI.showToast('Task removed', 'info');
            this.render();
          });
        }
      });
    });
  },

  openAddTaskModal() {
    this.currentEditTaskId = null;
    document.getElementById('task-modal-title').textContent = 'Add New Task';
    document.getElementById('task-form-id').value = '';
    document.getElementById('task-title-input').value = '';
    document.getElementById('task-desc-input').value = '';
    document.getElementById('task-date-input').value = Utils.formatDate(new Date());
    document.getElementById('task-time-input').value = '10:00 AM';
    document.getElementById('task-priority-select').value = 'High';
    document.getElementById('task-category-select').value = 'Fitness';

    UI.openModal('modal-task-form');
  },

  openEditTaskModal(taskId) {
    const task = AppState.tasks.find((t) => t.taskId === taskId);
    if (!task) return;

    this.currentEditTaskId = taskId;
    document.getElementById('task-modal-title').textContent = 'Edit Task';
    document.getElementById('task-form-id').value = task.taskId;
    document.getElementById('task-title-input').value = task.title;
    document.getElementById('task-desc-input').value = task.description || '';
    document.getElementById('task-date-input').value = task.date || Utils.formatDate(new Date());
    document.getElementById('task-time-input').value = task.time || '10:00 AM';
    document.getElementById('task-priority-select').value = task.priority || 'Medium';
    document.getElementById('task-category-select').value = task.category || 'General';

    UI.openModal('modal-task-form');
  },

  async handleTaskFormSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('task-title-input').value.trim();
    if (!title) {
      UI.showToast('Please enter a task title', 'error');
      return;
    }

    const description = document.getElementById('task-desc-input').value.trim();
    const date = document.getElementById('task-date-input').value || Utils.formatDate(new Date());
    const time = document.getElementById('task-time-input').value.trim() || '10:00 AM';
    const priority = document.getElementById('task-priority-select').value || 'Medium';
    const category = document.getElementById('task-category-select').value || 'General';
    const existingId = document.getElementById('task-form-id').value;

    if (existingId) {
      const task = AppState.tasks.find((t) => t.taskId === existingId);
      if (task) {
        task.title = title;
        task.description = description;
        task.date = date;
        task.time = time;
        task.priority = priority;
        task.category = category;

        await API.updateTask(task);
        UI.showToast('Task updated successfully!', 'success');
      }
    } else {
      const newTask = {
        taskId: Utils.generateId('TASK'),
        userId: AppState.currentUser,
        title,
        description,
        date,
        time,
        priority,
        category,
        completed: false,
        createdAt: Utils.formatDate(),
      };

      await API.addTask(newTask);
      AppState.tasks.unshift(newTask);
      UI.showToast('Task created successfully!', 'success');
    }

    AppState.recalculateStats();
    UI.closeModal('modal-task-form');
    this.render();
    if (AppState.currentScreen === 'home' && window.Dashboard) Dashboard.render();
  },
};

window.TasksView = TasksView;
