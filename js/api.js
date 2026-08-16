/* ==========================================================================
   GreenLife - API Communication Module (api.js)
   Connects to Google Apps Script Web App / Google Sheets Backend
   ========================================================================== */

const API = {
  // Default Google Apps Script Web App URL supplied in project requirements
  defaultEndpoint: 'https://script.google.com/macros/s/AKfycbxzLnjYkz-2cO3pFewHKFRqyctTLJbI2ZxtTW23M4jqQl4WUDYQiEaEJ6SEFeGq4uAk/exec',

  // Get current active endpoint (either custom configured or default)
  getEndpoint() {
    return Utils.storage.get('custom_api_endpoint') || this.defaultEndpoint;
  },

  // Set custom endpoint
  setEndpoint(url) {
    if (url && url.trim().length > 0) {
      Utils.storage.set('custom_api_endpoint', url.trim());
    } else {
      Utils.storage.remove('custom_api_endpoint');
    }
  },

  // Connection state tracking
  status: {
    online: navigator.onLine,
    lastSync: null,
    isSyncing: false,
    backendConnected: false,
  },

  // Core request dispatcher
  async request(action, params = {}, method = 'POST') {
    const endpoint = this.getEndpoint();
    const payload = { action, ...params, timestamp: new Date().toISOString() };

    this.status.isSyncing = true;
    if (window.UI && window.UI.updateSyncStatus) window.UI.updateSyncStatus();

    try {
      let response;
      if (method === 'GET') {
        const query = new URLSearchParams(payload).toString();
        response = await fetch(`${endpoint}?${query}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          redirect: 'follow',
        });
      } else {
        // We use text/plain for Google Apps Script to prevent complex CORS preflight issues
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
          redirect: 'follow',
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      this.status.backendConnected = true;
      this.status.lastSync = new Date();
      this.status.isSyncing = false;
      if (window.UI && window.UI.updateSyncStatus) window.UI.updateSyncStatus();

      return result;
    } catch (error) {
      console.warn(`[API] Remote call for "${action}" failed:`, error.message);
      this.status.backendConnected = false;
      this.status.isSyncing = false;
      if (window.UI && window.UI.updateSyncStatus) window.UI.updateSyncStatus();

      // Return a structured error response that caller can handle
      return {
        success: false,
        error: error.message,
        isFallback: true,
      };
    }
  },

  /* --------------------------------------------------------------------------
     USERS API
     -------------------------------------------------------------------------- */
  async getUsers() {
    const res = await this.request('getUsers', {}, 'GET');
    if (res.success && Array.isArray(res.data)) {
      Utils.storage.set('users', res.data);
      return res.data;
    }
    // Backend unreachable: fall back to last known real data from Sheets, if any
    const cached = Utils.storage.get('users');
    if (cached && Array.isArray(cached)) return cached;
    return [];
  },

  async updateUserAvatar(userId, avatarDataUrl) {
    if (!userId || !avatarDataUrl) throw new Error('userId and avatar are required');

    // Keep local cache in sync immediately
    const users = Utils.storage.get('users', []);
    const idx = users.findIndex((u) => u.userId === userId);
    if (idx !== -1) {
      users[idx].avatar = avatarDataUrl;
      Utils.storage.set('users', users);
    }

    const res = await this.request('updateUser', { userId, avatar: avatarDataUrl });
    return { success: true, remoteSuccess: res.success };
  },

  /* --------------------------------------------------------------------------
     HABITS API
     -------------------------------------------------------------------------- */
  async getHabits(userId) {
    if (!userId) throw new Error('userId is required');
    const res = await this.request('getHabits', { userId }, 'GET');
    if (res.success && Array.isArray(res.data)) {
      // Update local storage cache for this user
      Utils.storage.set(`habits_${userId}`, res.data);
      return res.data;
    }
    // Backend unreachable: fall back to last known real data from Sheets, if any
    const cached = Utils.storage.get(`habits_${userId}`);
    if (cached && Array.isArray(cached)) return cached;
    return [];
  },

  async addHabit(habitData) {
    if (!habitData.userId || !habitData.name) {
      throw new Error('Invalid habit data');
    }
    const habit = {
      habitId: habitData.habitId || Utils.generateId('HAB'),
      userId: habitData.userId,
      name: habitData.name,
      icon: habitData.icon || '🏃‍♂️',
      color: habitData.color || '#10b981',
      category: habitData.category || 'Fitness',
      frequency: habitData.frequency || 'Every day',
      target: habitData.target || '30 mins',
      reminderTime: habitData.reminderTime || '',
      createdAt: habitData.createdAt || Utils.formatDate(),
      active: habitData.active !== undefined ? habitData.active : true,
    };

    // Optimistically update local cache
    const habits = Utils.storage.get(`habits_${habit.userId}`, []);
    habits.unshift(habit);
    Utils.storage.set(`habits_${habit.userId}`, habits);

    const res = await this.request('addHabit', { habit });
    return { success: true, data: habit, remoteSuccess: res.success };
  },

  async updateHabit(habitData) {
    if (!habitData.habitId || !habitData.userId) {
      throw new Error('Habit ID and User ID required for update');
    }
    const habits = Utils.storage.get(`habits_${habitData.userId}`, []);
    const index = habits.findIndex((h) => h.habitId === habitData.habitId);
    if (index !== -1) {
      habits[index] = { ...habits[index], ...habitData, updatedAt: Utils.formatDate() };
      Utils.storage.set(`habits_${habitData.userId}`, habits);
    }

    const res = await this.request('updateHabit', { habit: habitData });
    return { success: true, data: habitData, remoteSuccess: res.success };
  },

  async deleteHabit(habitId, userId) {
    if (!habitId || !userId) throw new Error('habitId and userId required');
    const habits = Utils.storage.get(`habits_${userId}`, []);
    const filtered = habits.filter((h) => h.habitId !== habitId);
    Utils.storage.set(`habits_${userId}`, filtered);

    // Also remove logs for this habit
    const logs = Utils.storage.get(`habit_logs_${userId}`, []);
    const filteredLogs = logs.filter((l) => l.habitId !== habitId);
    Utils.storage.set(`habit_logs_${userId}`, filteredLogs);

    const res = await this.request('deleteHabit', { habitId, userId });
    return { success: true, remoteSuccess: res.success };
  },

  async toggleHabit(data) {
    // data: { habitId, userId, date, completed }
    const { habitId, userId, date, completed } = data;
    if (!habitId || !userId || !date) throw new Error('Missing toggle parameters');

    const logs = Utils.storage.get(`habit_logs_${userId}`, []);
    const existingIndex = logs.findIndex((l) => l.habitId === habitId && l.date === date);

    let currentLog;
    if (existingIndex !== -1) {
      logs[existingIndex].completed = completed;
      logs[existingIndex].completedAt = completed ? new Date().toISOString() : null;
      currentLog = logs[existingIndex];
    } else {
      currentLog = {
        logId: Utils.generateId('LOG'),
        habitId,
        userId,
        date,
        completed,
        completedAt: completed ? new Date().toISOString() : null,
      };
      logs.push(currentLog);
    }

    Utils.storage.set(`habit_logs_${userId}`, logs);

    const res = await this.request('toggleHabit', {
      habitId,
      userId,
      date,
      completed,
      logId: currentLog.logId,
      completedAt: currentLog.completedAt,
    });

    return { success: true, data: currentLog, remoteSuccess: res.success };
  },

  /* --------------------------------------------------------------------------
     HABIT LOGS API
     -------------------------------------------------------------------------- */
  async getHabitLogs(userId) {
    if (!userId) return [];
    const res = await this.request('getHabitLogs', { userId }, 'GET');
    if (res.success && Array.isArray(res.data)) {
      Utils.storage.set(`habit_logs_${userId}`, res.data);
      return res.data;
    }
    const cached = Utils.storage.get(`habit_logs_${userId}`);
    if (cached && Array.isArray(cached)) return cached;
    return [];
  },

  /* --------------------------------------------------------------------------
     TASKS API
     -------------------------------------------------------------------------- */
  async getTasks(userId) {
    if (!userId) throw new Error('userId is required');
    const res = await this.request('getTasks', { userId }, 'GET');
    if (res.success && Array.isArray(res.data)) {
      Utils.storage.set(`tasks_${userId}`, res.data);
      return res.data;
    }
    const cached = Utils.storage.get(`tasks_${userId}`);
    if (cached && Array.isArray(cached)) return cached;
    return [];
  },

  async addTask(taskData) {
    if (!taskData.userId || !taskData.title) throw new Error('Invalid task data');
    const task = {
      taskId: taskData.taskId || Utils.generateId('TASK'),
      userId: taskData.userId,
      title: taskData.title,
      description: taskData.description || '',
      date: taskData.date || Utils.formatDate(),
      time: taskData.time || '10:00 AM',
      priority: taskData.priority || 'Medium',
      category: taskData.category || 'General',
      completed: !!taskData.completed,
      createdAt: taskData.createdAt || Utils.formatDate(),
    };

    const tasks = Utils.storage.get(`tasks_${task.userId}`, []);
    tasks.unshift(task);
    Utils.storage.set(`tasks_${task.userId}`, tasks);

    const res = await this.request('addTask', { task });
    return { success: true, data: task, remoteSuccess: res.success };
  },

  async updateTask(taskData) {
    if (!taskData.taskId || !taskData.userId) throw new Error('Task ID & User ID required');
    const tasks = Utils.storage.get(`tasks_${taskData.userId}`, []);
    const index = tasks.findIndex((t) => t.taskId === taskData.taskId);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...taskData, updatedAt: Utils.formatDate() };
      Utils.storage.set(`tasks_${taskData.userId}`, tasks);
    }

    const res = await this.request('updateTask', { task: taskData });
    return { success: true, data: taskData, remoteSuccess: res.success };
  },

  async deleteTask(taskId, userId) {
    if (!taskId || !userId) throw new Error('taskId and userId required');
    const tasks = Utils.storage.get(`tasks_${userId}`, []);
    const filtered = tasks.filter((t) => t.taskId !== taskId);
    Utils.storage.set(`tasks_${userId}`, filtered);

    const res = await this.request('deleteTask', { taskId, userId });
    return { success: true, remoteSuccess: res.success };
  },

  async toggleTask(taskId, userId, completed) {
    if (!taskId || !userId) throw new Error('taskId and userId required');
    const tasks = Utils.storage.get(`tasks_${userId}`, []);
    const task = tasks.find((t) => t.taskId === taskId);
    if (task) {
      task.completed = completed;
      task.completedAt = completed ? new Date().toISOString() : null;
      Utils.storage.set(`tasks_${userId}`, tasks);
    }

    const res = await this.request('toggleTask', { taskId, userId, completed });
    return { success: true, remoteSuccess: res.success };
  },

  /* --------------------------------------------------------------------------
     DASHBOARD & STATS API
     -------------------------------------------------------------------------- */
  async getProgress(userId, date) {
    const res = await this.request('getProgress', { userId, date }, 'GET');
    if (res.success && res.data) return res.data;

    // Compute client-side from local logs and habits
    const habits = await this.getHabits(userId);
    const logs = await this.getHabitLogs(userId);
    const activeHabits = habits.filter((h) => h.active);
    const dateLogs = logs.filter((l) => l.date === date && l.completed);

    const total = activeHabits.length;
    const completedCount = activeHabits.filter((h) =>
      dateLogs.some((l) => l.habitId === h.habitId)
    ).length;
    const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return {
      userId,
      date,
      totalHabits: total,
      completedHabits: completedCount,
      percentage,
    };
  },

  async getCalendar(userId, monthStr) {
    const res = await this.request('getCalendar', { userId, month: monthStr }, 'GET');
    if (res.success && res.data) return res.data;

    const habits = await this.getHabits(userId);
    const logs = await this.getHabitLogs(userId);
    const tasks = await this.getTasks(userId);

    return {
      userId,
      month: monthStr,
      habits,
      logs,
      tasks,
    };
  },

  async getStatistics(userId) {
    const res = await this.request('getStatistics', { userId }, 'GET');
    if (res.success && res.data) return res.data;

    const habits = await this.getHabits(userId);
    const logs = await this.getHabitLogs(userId);
    const tasks = await this.getTasks(userId);

    const completedLogs = logs.filter((l) => l.completed);
    const completedTasks = tasks.filter((t) => t.completed);

    let maxStreak = 0;
    habits.forEach((h) => {
      const s = Utils.calculateHabitStreak(logs, h.habitId);
      if (s > maxStreak) maxStreak = s;
    });

    const activeHabitsCount = habits.filter((h) => h.active).length;
    const totalPotentialLogs = activeHabitsCount * 7;
    const successRate = totalPotentialLogs > 0 ? Math.min(100, Math.round((completedLogs.length / (activeHabitsCount * 14)) * 100)) : 0;

    return {
      userId,
      currentStreak: maxStreak,
      longestStreak: maxStreak,
      totalHabitsCount: habits.length,
      totalHabitsCompleted: completedLogs.length,
      totalTasksCount: tasks.length,
      totalTasksCompleted: completedTasks.length,
      habitSuccessRate: successRate,
    };
  },
};

window.API = API;