/* ==========================================================================
   GreenLife - Screen 1: Dashboard / Today (dashboard.js)
   Renders Today's Dynamic Habits, Progress Ring, Date Switcher & Daily Summary
   ========================================================================== */

const Dashboard = {
  render() {
    const container = document.getElementById('screen-home');
    if (!container) return;

    const user = AppState.getCurrentUserObj();
    if (!user) return;

    const selectedDate = AppState.selectedDate;
    const activeHabits = AppState.habits.filter((h) => h.active);
    const todayLogs = AppState.habitLogs.filter((l) => l.date === selectedDate);

    // Calculate completed habits for the selected date
    const completedCount = activeHabits.filter((h) =>
      todayLogs.some((l) => l.habitId === h.habitId && l.completed)
    ).length;

    const totalHabits = activeHabits.length;
    const progressPercent = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;
    const { circumference, offset } = Utils.calculateRingOffset(progressPercent, 42);

    // Filter tasks due for selected date
    const dateTasks = AppState.tasks.filter((t) => t.date === selectedDate);
    const completedTasksCount = dateTasks.filter((t) => t.completed).length;

    const isToday = selectedDate === Utils.formatDate(new Date());

    container.innerHTML = `
      <!-- Dynamic Greeting Header Sub-bar -->
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text); letter-spacing: -0.5px;">
          ${Utils.getGreeting(user.name)}
        </h2>
        <p style="font-size: 0.88rem; color: var(--text-muted);">
          Let's make today count. Stay consistent, stay unstoppable.
        </p>
      </div>

      <!-- Date Selector Bar -->
      <div class="date-selector-bar">
        <button class="date-selector-btn" id="dash-prev-date-btn" aria-label="Previous day">◀</button>
        <div class="date-selector-display">
          <span>📅 ${Utils.formatDisplayDate(selectedDate)}</span>
          ${isToday ? '<span class="today-chip">TODAY</span>' : ''}
        </div>
        <button class="date-selector-btn" id="dash-next-date-btn" aria-label="Next day">▶</button>
      </div>

      <!-- Hero Today's Progress Card -->
      <div class="card progress-hero-card">
        <div class="progress-hero-content">
          <div class="progress-hero-text">
            <h3>Daily Habit Completion</h3>
            <div class="progress-hero-stat">${progressPercent}%</div>
            <div class="progress-hero-sub">
              ${completedCount} of ${totalHabits} habits completed
            </div>
            <div style="margin-top: 10px; font-size: 0.78rem; color: var(--accent-mint); font-weight: 600;">
              🔥 ${AppState.statistics.currentStreak || 0} Day Active Streak
            </div>
          </div>

          <div class="progress-ring-container">
            <svg class="progress-ring-svg" viewBox="0 0 100 100">
              <circle
                class="progress-ring-bg"
                cx="50"
                cy="50"
                r="42"
                stroke-width="9"
                fill="none"
              />
              <circle
                class="progress-ring-circle"
                cx="50"
                cy="50"
                r="42"
                stroke-width="9"
                fill="none"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"
              />
            </svg>
            <div class="progress-ring-text">
              ${progressPercent}%
              <span>${completedCount}/${totalHabits}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Today's Habits Section -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin: 24px 0 12px;">
        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text);">
          Today's Habits
        </h3>
        <button id="dash-add-habit-btn" style="font-size: 0.85rem; font-weight: 700; color: var(--primary-dark); display: flex; align-items: center; gap: 4px;">
          + Add New
        </button>
      </div>

      <div class="habits-list" id="dashboard-habits-container">
        ${
          activeHabits.length === 0
            ? `<div class="card" style="text-align: center; padding: 32px 16px; color: var(--text-muted);">
                <div style="font-size: 2rem; margin-bottom: 8px;">🌱</div>
                <div style="font-weight: 700; color: var(--text); margin-bottom: 4px;">No habits yet</div>
                <p style="font-size: 0.85rem; margin-bottom: 14px;">Build your athlete routine by creating your first daily habit.</p>
                <button class="btn-primary" style="max-width: 200px; margin: 0 auto;" id="dash-empty-add-habit">Create Habit</button>
              </div>`
            : activeHabits
                .map((habit) => {
                  const isDone = todayLogs.some((l) => l.habitId === habit.habitId && l.completed);
                  const streak = Utils.calculateHabitStreak(AppState.habitLogs, habit.habitId);

                  return `
            <div class="habit-card ${isDone ? 'completed' : ''}" data-habit-id="${habit.habitId}">
              <div class="habit-left">
                <div class="habit-icon-box" style="${habit.color ? `background: ${isDone ? 'var(--primary)' : habit.color + '22'}; color: ${isDone ? '#fff' : habit.color};` : ''}">
                  ${habit.icon || '🏃‍♂️'}
                </div>
                <div class="habit-info">
                  <div class="habit-name">${habit.name}</div>
                  <div class="habit-meta">
                    <span class="habit-badge">${habit.target || 'Daily'}</span>
                    ${streak > 0 ? `<span class="habit-badge streak-badge">🔥 ${streak}d</span>` : ''}
                    <span>${isDone ? 'Completed' : 'Not completed'}</span>
                  </div>
                </div>
              </div>
              <button 
                class="habit-check-btn" 
                data-habit-id="${habit.habitId}" 
                aria-label="Toggle ${habit.name}"
                title="${isDone ? 'Mark Incomplete' : 'Mark Complete'}"
              >
                ${isDone ? '✓' : ''}
              </button>
            </div>
          `;
                })
                .join('')
        }
      </div>

      <!-- Quick Tasks for Today Section -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin: 28px 0 12px;">
        <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text);">
          Today's Tasks (${completedTasksCount}/${dateTasks.length})
        </h3>
        <button id="dash-view-all-tasks-btn" style="font-size: 0.85rem; font-weight: 700; color: var(--primary-dark);">
          View All →
        </button>
      </div>

      <div class="tasks-list">
        ${
          dateTasks.length === 0
            ? `<div class="card" style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.85rem;">
                No scheduled tasks for this date.
              </div>`
            : dateTasks
                .slice(0, 3)
                .map(
                  (task) => `
            <div class="task-card ${task.completed ? 'completed' : ''}" data-task-id="${task.taskId}">
              <button class="task-checkbox-btn dash-task-toggle" data-task-id="${task.taskId}">
                ${task.completed ? '✓' : ''}
              </button>
              <div class="task-content">
                <div class="task-title">${task.title}</div>
                <div class="task-badges">
                  <span class="priority-badge priority-${(task.priority || 'medium').toLowerCase()}">${task.priority}</span>
                  <span class="task-time-badge">⏰ ${task.time || 'Anytime'}</span>
                  ${task.category ? `<span class="habit-badge">${task.category}</span>` : ''}
                </div>
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
    // Habit toggle check buttons
    document.querySelectorAll('.habit-check-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const habitId = e.currentTarget.dataset.habitId;
        const rect = e.currentTarget.getBoundingClientRect();
        Utils.triggerConfetti(rect.left + rect.width / 2, rect.top + rect.height / 2);
        AppState.toggleHabit(habitId);
      });
    });

    // Date selector previous / next day
    const prevBtn = document.getElementById('dash-prev-date-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const curr = Utils.parseLocalDate(AppState.selectedDate);
        curr.setDate(curr.getDate() - 1);
        AppState.setSelectedDate(Utils.formatDate(curr));
        this.render();
      });
    }

    const nextBtn = document.getElementById('dash-next-date-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const curr = Utils.parseLocalDate(AppState.selectedDate);
        curr.setDate(curr.getDate() + 1);
        AppState.setSelectedDate(Utils.formatDate(curr));
        this.render();
      });
    }

    // Quick Task Checkbox
    document.querySelectorAll('.dash-task-toggle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const taskId = e.currentTarget.dataset.taskId;
        AppState.toggleTask(taskId);
      });
    });

    // Nav shortcuts
    const addHabitBtn = document.getElementById('dash-add-habit-btn');
    if (addHabitBtn) {
      addHabitBtn.addEventListener('click', () => {
        if (window.HabitsView) HabitsView.openAddHabitModal();
      });
    }

    const emptyAddBtn = document.getElementById('dash-empty-add-habit');
    if (emptyAddBtn) {
      emptyAddBtn.addEventListener('click', () => {
        if (window.HabitsView) HabitsView.openAddHabitModal();
      });
    }

    const viewAllTasksBtn = document.getElementById('dash-view-all-tasks-btn');
    if (viewAllTasksBtn) {
      viewAllTasksBtn.addEventListener('click', () => {
        UI.navigateTo('tasks');
      });
    }
  },
};

window.Dashboard = Dashboard;
