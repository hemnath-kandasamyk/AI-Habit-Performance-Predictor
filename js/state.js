/* ==========================================================================
   GreenLife - State Management (state.js)
   Central Reactive Application State & Event Dispatcher
   ========================================================================== */

const AppState = {
  // Current logged in user: 'hemnath' | 'velu' | null
  currentUser: null,
  users: [],

  // User-specific data collections (strictly isolated per user)
  habits: [],
  habitLogs: [],
  tasks: [],

  // View navigation & filters
  currentScreen: 'home',
  selectedDate: Utils.formatDate(new Date()),
  selectedMonth: new Date().toISOString().slice(0, 7), // YYYY-MM
  taskFilter: 'today', // 'today' | 'upcoming' | 'completed'
  habitFilter: 'all', // 'all' | 'daily' | 'active' | 'paused'
  habitSearch: '',
  taskSearch: '',

  // Computed metrics
  statistics: {
    currentStreak: 0,
    longestStreak: 0,
    totalHabitsCount: 0,
    totalHabitsCompleted: 0,
    totalTasksCount: 0,
    totalTasksCompleted: 0,
    habitSuccessRate: 0,
  },

  // State flags
  loading: false,
  offline: !navigator.onLine,
  theme: Utils.storage.get('theme', 'light'),

  // Listeners subscription system
  listeners: [],

  subscribe(listener) {
    if (typeof listener === 'function') {
      this.listeners.push(listener);
    }
  },

  notify(changeType = 'ALL') {
    this.listeners.forEach((listener) => {
      try {
        listener(this, changeType);
      } catch (err) {
        console.error('[AppState] Error in listener:', err);
      }
    });
  },

  // Switch or Set Current User
  async setCurrentUser(userId) {
    if (!userId) return;
    if (this.currentUser === userId && this.habits.length > 0) return;

    this.loading = true;
    this.notify('LOADING');

    // Completely clear prior user's data to guarantee strict isolation
    this.currentUser = userId;
    this.habits = [];
    this.habitLogs = [];
    this.tasks = [];
    this.selectedDate = Utils.formatDate(new Date());
    Utils.storage.set('currentUser', userId);

    try {
      await this.loadUserData(userId);
    } catch (err) {
      console.error('[AppState] Error loading user data:', err);
      if (window.UI) UI.showToast('Failed to load profile data', 'error');
    } finally {
      this.loading = false;
      this.notify('USER_CHANGED');
    }
  },

  // Fetch all data for current user
  async loadUserData(userId = this.currentUser) {
    if (!userId) return;

    try {
      const [users, habits, logs, tasks, stats] = await Promise.all([
        API.getUsers(),
        API.getHabits(userId),
        API.getHabitLogs(userId),
        API.getTasks(userId),
        API.getStatistics(userId),
      ]);

      this.users = users;
      // Filter strictly by userId as safety guarantee
      this.habits = (habits || []).filter((h) => h.userId === userId);
      this.habitLogs = (logs || []).filter((l) => l.userId === userId);
      this.tasks = (tasks || []).filter((t) => t.userId === userId);
      this.statistics = stats || this.statistics;

      this.recalculateStats();
    } catch (e) {
      console.warn('[AppState] loadUserData issue:', e);
    }
  },

  // Recalculate streaks and rates dynamically from current habitLogs & habits
  recalculateStats() {
    const activeHabits = this.habits.filter((h) => h.active);
    let maxStreak = 0;

    activeHabits.forEach((h) => {
      const s = Utils.calculateHabitStreak(this.habitLogs, h.habitId);
      if (s > maxStreak) maxStreak = s;
    });

    const completedLogs = this.habitLogs.filter((l) => l.completed);
    const completedTasks = this.tasks.filter((t) => t.completed);

    const totalActive = activeHabits.length;
    const rate = totalActive > 0 ? Math.min(100, Math.round((completedLogs.length / (totalActive * 14)) * 100)) : 0;

    this.statistics = {
      currentStreak: maxStreak,
      longestStreak: Math.max(maxStreak, this.statistics.longestStreak || 0),
      totalHabitsCount: this.habits.length,
      totalHabitsCompleted: completedLogs.length,
      totalTasksCount: this.tasks.length,
      totalTasksCompleted: completedTasks.length,
      habitSuccessRate: rate,
    };
  },

  // Get current active user object
  getCurrentUserObj() {
    if (!this.currentUser) return null;
    const found = this.users.find((u) => u.userId === this.currentUser);
    if (found) {
      return {
        ...found,
        avatar: found.avatar || Utils.athleteAvatars[this.currentUser] || Utils.athleteAvatars.hemnath,
      };
    }

    return {
      userId: this.currentUser,
      name: this.currentUser === 'hemnath' ? 'Hemnath' : 'Velu',
      role: this.currentUser === 'hemnath' ? 'Track & Endurance Athlete' : 'High-Performance Triathlete',
      avatar: Utils.athleteAvatars[this.currentUser] || Utils.athleteAvatars.hemnath,
    };
  },

  // Date selection change
  setSelectedDate(dateStr) {
    this.selectedDate = dateStr;
    this.notify('DATE_CHANGED');
  },

  setSelectedMonth(monthStr) {
    this.selectedMonth = monthStr;
    this.notify('MONTH_CHANGED');
  },

  // Toggle habit completion optimistically
  async toggleHabit(habitId, dateStr = this.selectedDate) {
    if (!this.currentUser) return;

    const existingIndex = this.habitLogs.findIndex(
      (l) => l.habitId === habitId && l.date === dateStr
    );

    const willBeCompleted = existingIndex === -1 ? true : !this.habitLogs[existingIndex].completed;

    if (existingIndex !== -1) {
      this.habitLogs[existingIndex].completed = willBeCompleted;
      this.habitLogs[existingIndex].completedAt = willBeCompleted ? new Date().toISOString() : null;
    } else {
      this.habitLogs.push({
        logId: Utils.generateId('LOG'),
        habitId,
        userId: this.currentUser,
        date: dateStr,
        completed: willBeCompleted,
        completedAt: willBeCompleted ? new Date().toISOString() : null,
      });
    }

    this.recalculateStats();
    this.notify('HABITS_UPDATED');

    // Trigger asynchronous backend update
    try {
      const res = await API.toggleHabit({
        habitId,
        userId: this.currentUser,
        date: dateStr,
        completed: willBeCompleted,
      });

      if (!res.success && !res.remoteSuccess) {
        console.warn('API sync deferred; cached locally');
      }
    } catch (err) {
      console.error('Failed to sync habit toggle to API:', err);
      // Revert if critical error
      UI.showToast('Could not sync habit to server. Saved locally.', 'info');
    }
  },

  // Toggle task completion
  async toggleTask(taskId) {
    if (!this.currentUser) return;
    const task = this.tasks.find((t) => t.taskId === taskId);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;

    this.recalculateStats();
    this.notify('TASKS_UPDATED');

    try {
      await API.toggleTask(taskId, this.currentUser, task.completed);
    } catch (err) {
      console.error('Failed to sync task toggle:', err);
    }
  },
};

window.AppState = AppState;
