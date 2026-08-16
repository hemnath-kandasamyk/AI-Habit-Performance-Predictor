/* ==========================================================================
   GreenLife - Screen 2: Habit Management (habits.js)
   Search, Filter, 7-Day Matrix, Streaks, Add/Edit/Delete Habits
   ========================================================================== */

const HabitsView = {
  currentEditHabitId: null,

  render() {
    const container = document.getElementById('screen-habits');
    if (!container) return;

    let filteredHabits = [...AppState.habits];

    // Search filter
    if (AppState.habitSearch && AppState.habitSearch.trim().length > 0) {
      const q = AppState.habitSearch.toLowerCase();
      filteredHabits = filteredHabits.filter(
        (h) => h.name.toLowerCase().includes(q) || (h.category && h.category.toLowerCase().includes(q))
      );
    }

    // Tab filter
    if (AppState.habitFilter === 'active') {
      filteredHabits = filteredHabits.filter((h) => h.active);
    } else if (AppState.habitFilter === 'paused') {
      filteredHabits = filteredHabits.filter((h) => !h.active);
    } else if (AppState.habitFilter === 'daily') {
      filteredHabits = filteredHabits.filter((h) => h.frequency === 'Every day');
    }

    const currentWeek = Utils.getWeekDays(new Date());

    container.innerHTML = `
      <!-- Screen Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <div>
          <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text);">My Habits</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Manage routines & track 7-day consistency</p>
        </div>
        <button class="btn-primary" id="habits-add-new-btn" style="width: auto; padding: 10px 18px; margin: 0; font-size: 0.9rem;">
          + Add Habit
        </button>
      </div>

      <!-- Search & Filters -->
      <div class="search-filter-box">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            class="search-input" 
            id="habit-search-input" 
            placeholder="Search habits by name or category..." 
            value="${AppState.habitSearch || ''}"
          />
        </div>

        <div class="filter-tabs">
          <button class="filter-tab ${AppState.habitFilter === 'all' ? 'active' : ''}" data-filter="all">All (${AppState.habits.length})</button>
          <button class="filter-tab ${AppState.habitFilter === 'active' ? 'active' : ''}" data-filter="active">Active (${AppState.habits.filter((h) => h.active).length})</button>
          <button class="filter-tab ${AppState.habitFilter === 'daily' ? 'active' : ''}" data-filter="daily">Daily</button>
          <button class="filter-tab ${AppState.habitFilter === 'paused' ? 'active' : ''}" data-filter="paused">Paused (${AppState.habits.filter((h) => !h.active).length})</button>
        </div>
      </div>

      <!-- Habits List -->
      <div class="habits-list">
        ${
          filteredHabits.length === 0
            ? `<div class="card" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                <div style="font-size: 2.2rem; margin-bottom: 12px;">🏃‍♂️</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: var(--text); margin-bottom: 6px;">No habits found</div>
                <p style="font-size: 0.85rem; margin-bottom: 16px;">Try changing your search filters or create a new habit.</p>
                <button class="btn-primary" style="max-width: 200px; margin: 0 auto;" id="habit-empty-add-btn">+ Create Habit</button>
              </div>`
            : filteredHabits
                .map((habit) => {
                  const streak = Utils.calculateHabitStreak(AppState.habitLogs, habit.habitId);
                  
                  // Compute 7-day completion
                  let weekCompletedCount = 0;
                  const weekDotsHtml = currentWeek
                    .map((day) => {
                      const isDone = AppState.habitLogs.some(
                        (l) => l.habitId === habit.habitId && l.date === day.dateStr && l.completed
                      );
                      if (isDone) weekCompletedCount++;
                      return `
                        <div class="weekday-col">
                          <span class="weekday-label">${day.label}</span>
                          <div class="weekday-dot ${isDone ? 'done' : ''} ${day.isToday ? 'today' : ''}">
                            ${isDone ? '✓' : ''}
                          </div>
                        </div>
                      `;
                    })
                    .join('');

                  const weeklyRate = Math.round((weekCompletedCount / 7) * 100);

                  return `
            <div class="habit-mgmt-card ${!habit.active ? 'paused' : ''}">
              <div class="habit-mgmt-top">
                <div class="habit-left">
                  <div class="habit-icon-box" style="background: ${habit.color ? habit.color + '22' : 'var(--primary-light)'}; color: ${habit.color || 'var(--primary-dark)'};">
                    ${habit.icon || '🏃‍♂️'}
                  </div>
                  <div class="habit-info">
                    <div class="habit-name">${habit.name}</div>
                    <div class="habit-meta">
                      <span class="habit-badge">${habit.frequency || 'Daily'}</span>
                      <span class="habit-badge">${habit.target || '30 mins'}</span>
                      ${!habit.active ? '<span class="habit-badge" style="color: var(--accent-red); background: #fee2e2;">Paused</span>' : ''}
                    </div>
                  </div>
                </div>

                <div class="habit-mgmt-actions">
                  <button class="icon-btn habit-edit-btn" data-id="${habit.habitId}" title="Edit habit">✏️</button>
                  <button class="icon-btn habit-pause-btn" data-id="${habit.habitId}" title="${habit.active ? 'Pause' : 'Resume'}">
                    ${habit.active ? '⏸️' : '▶️'}
                  </button>
                  <button class="icon-btn habit-delete-btn" data-id="${habit.habitId}" title="Delete habit" style="color: var(--accent-red);">🗑️</button>
                </div>
              </div>

              <!-- Weekly 7-Day Completion Dots -->
              <div class="habit-weekly-row">
                ${weekDotsHtml}
              </div>

              <!-- Metrics Footer -->
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 12px; font-size: 0.8rem; font-weight: 700;">
                <span style="color: #d97706;">🔥 ${streak} Days Streak</span>
                <span style="color: var(--primary-dark);">${weeklyRate}% Complete this week</span>
              </div>

              <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${weeklyRate}%;"></div>
              </div>
            </div>
          `;
                })
                .join('')
        }
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    // Add habit button
    const addBtn = document.getElementById('habits-add-new-btn');
    if (addBtn) addBtn.addEventListener('click', () => this.openAddHabitModal());

    const emptyAdd = document.getElementById('habit-empty-add-btn');
    if (emptyAdd) emptyAdd.addEventListener('click', () => this.openAddHabitModal());

    // Search input
    const searchInput = document.getElementById('habit-search-input');
    if (searchInput) {
      searchInput.addEventListener(
        'input',
        Utils.debounce((e) => {
          AppState.habitSearch = e.target.value;
          this.render();
        }, 200)
      );
    }

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        AppState.habitFilter = e.currentTarget.dataset.filter;
        this.render();
      });
    });

    // Edit buttons
    document.querySelectorAll('.habit-edit-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.openEditHabitModal(id);
      });
    });

    // Pause / Resume buttons
    document.querySelectorAll('.habit-pause-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        const habit = AppState.habits.find((h) => h.habitId === id);
        if (habit) {
          const nextActive = !habit.active;
          habit.active = nextActive;
          await API.updateHabit(habit);
          UI.showToast(`Habit ${nextActive ? 'resumed' : 'paused'}`, 'info');
          this.render();
        }
      });
    });

    // Delete buttons
    document.querySelectorAll('.habit-delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const habit = AppState.habits.find((h) => h.habitId === id);
        if (habit) {
          UI.showConfirm(
            `Delete "${habit.name}"?`,
            'Your existing completion logs for this habit will also be removed. This cannot be undone.',
            async () => {
              await API.deleteHabit(id, AppState.currentUser);
              AppState.habits = AppState.habits.filter((h) => h.habitId !== id);
              AppState.habitLogs = AppState.habitLogs.filter((l) => l.habitId !== id);
              AppState.recalculateStats();
              UI.showToast('Habit deleted successfully', 'info');
              this.render();
            }
          );
        }
      });
    });
  },

  openAddHabitModal() {
    this.currentEditHabitId = null;
    document.getElementById('habit-modal-title').textContent = 'Create New Habit';
    document.getElementById('habit-form-id').value = '';
    document.getElementById('habit-name-input').value = '';
    document.getElementById('habit-target-input').value = '30 mins';
    document.getElementById('habit-category-select').value = 'Fitness';
    document.getElementById('habit-reminder-input').value = '07:00 AM';

    // Reset selected icon
    this.setSelectedIcon('🏃‍♂️');
    this.setSelectedFrequency('Every day');

    UI.openModal('modal-habit-form');
  },

  openEditHabitModal(habitId) {
    const habit = AppState.habits.find((h) => h.habitId === habitId);
    if (!habit) return;

    this.currentEditHabitId = habitId;
    document.getElementById('habit-modal-title').textContent = 'Edit Habit';
    document.getElementById('habit-form-id').value = habit.habitId;
    document.getElementById('habit-name-input').value = habit.name;
    document.getElementById('habit-target-input').value = habit.target || '';
    document.getElementById('habit-category-select').value = habit.category || 'Fitness';
    document.getElementById('habit-reminder-input').value = habit.reminderTime || '';

    this.setSelectedIcon(habit.icon || '🏃‍♂️');
    this.setSelectedFrequency(habit.frequency || 'Every day');

    UI.openModal('modal-habit-form');
  },

  setSelectedIcon(icon) {
    document.getElementById('habit-selected-icon').value = icon;
    document.querySelectorAll('.icon-preset-btn').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.icon === icon);
    });
  },

  setSelectedFrequency(freq) {
    document.getElementById('habit-selected-freq').value = freq;
    document.querySelectorAll('#habit-freq-pills .freq-pill').forEach((pill) => {
      pill.classList.toggle('selected', pill.dataset.freq === freq);
    });
  },

  async handleHabitFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('habit-name-input').value.trim();
    if (!name) {
      UI.showToast('Please enter a habit name', 'error');
      return;
    }

    const icon = document.getElementById('habit-selected-icon').value || '🏃‍♂️';
    const frequency = document.getElementById('habit-selected-freq').value || 'Every day';
    const target = document.getElementById('habit-target-input').value.trim() || 'Daily';
    const category = document.getElementById('habit-category-select').value || 'Fitness';
    const reminderTime = document.getElementById('habit-reminder-input').value || '';
    const existingId = document.getElementById('habit-form-id').value;

    const colors = {
      Fitness: '#10b981',
      Health: '#06b6d4',
      Learning: '#3b82f6',
      Mind: '#8b5cf6',
      Productivity: '#f59e0b',
    };

    if (existingId) {
      // Update
      const habit = AppState.habits.find((h) => h.habitId === existingId);
      if (habit) {
        habit.name = name;
        habit.icon = icon;
        habit.frequency = frequency;
        habit.target = target;
        habit.category = category;
        habit.reminderTime = reminderTime;
        habit.color = colors[category] || '#10b981';

        await API.updateHabit(habit);
        UI.showToast('Habit updated successfully!', 'success');
      }
    } else {
      // Create new
      const newHabit = {
        habitId: Utils.generateId('HAB'),
        userId: AppState.currentUser,
        name,
        icon,
        frequency,
        target,
        category,
        reminderTime,
        color: colors[category] || '#10b981',
        createdAt: Utils.formatDate(),
        active: true,
      };

      await API.addHabit(newHabit);
      AppState.habits.unshift(newHabit);
      UI.showToast('New habit created! Let\'s build the streak! 🔥', 'success');
    }

    AppState.recalculateStats();
    UI.closeModal('modal-habit-form');
    this.render();
    if (AppState.currentScreen === 'home' && window.Dashboard) Dashboard.render();
  },
};

window.HabitsView = HabitsView;
