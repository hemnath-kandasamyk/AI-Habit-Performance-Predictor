/* ==========================================================================
   GreenLife - UI Core Manager (ui.js)
   Screen Transitions, Modals, Toasts, Skeletons, Theme & Navigation
   ========================================================================== */

const UI = {
  // Switch visible screen
  navigateTo(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach((s) => s.classList.remove('active'));

    const target = document.getElementById(`screen-${screenId}`);
    if (target) {
      target.classList.add('active');
      AppState.currentScreen = screenId;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update Bottom Nav and Sidebar active styles
    document.querySelectorAll('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.screen === screenId);
    });

    document.querySelectorAll('.sidebar-nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.screen === screenId);
    });

    // Render screen specific data
    this.renderCurrentScreen();
  },

  renderCurrentScreen() {
    const screen = AppState.currentScreen;
    if (screen === 'home' && window.Dashboard) Dashboard.render();
    if (screen === 'habits' && window.HabitsView) HabitsView.render();
    if (screen === 'tasks' && window.TasksView) TasksView.render();
    if (screen === 'calendar' && window.CalendarView) CalendarView.render();
    if (screen === 'analytics' && window.AnalyticsView) AnalyticsView.render();
    if (screen === 'profile' && window.ProfileView) ProfileView.render();
  },

  // Open Modal
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  // Close Modal
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  // Toast Notification
  showToast(message, type = 'success', duration = 3200) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'info') icon = 'ℹ';

    toast.innerHTML = `
      <span style="font-size: 1.1rem; font-weight: bold;">${icon}</span>
      <div style="flex: 1;">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Generic Confirmation Modal
  showConfirm(title, message, onConfirm) {
    const confirmModal = document.getElementById('modal-confirm');
    if (!confirmModal) {
      if (confirm(`${title}\n\n${message}`)) onConfirm();
      return;
    }

    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;

    const confirmBtn = document.getElementById('confirm-action-btn');
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

    newBtn.addEventListener('click', () => {
      UI.closeModal('modal-confirm');
      if (typeof onConfirm === 'function') onConfirm();
    });

    this.openModal('modal-confirm');
  },

  // Update backend sync indicator in header
  updateSyncStatus() {
    const dot = document.getElementById('sync-indicator-dot');
    const label = document.getElementById('sync-status-label');
    if (!dot || !label) return;

    if (!navigator.onLine) {
      dot.className = 'status-indicator-dot offline';
      label.textContent = 'Offline';
      return;
    }

    if (API.status.isSyncing) {
      dot.className = 'status-indicator-dot syncing';
      label.textContent = 'Syncing...';
    } else if (API.status.backendConnected) {
      dot.className = 'status-indicator-dot';
      label.textContent = 'Sheets Live';
    } else {
      dot.className = 'status-indicator-dot';
      label.textContent = 'Local Sync';
    }
  },

  // Toggle Theme (Light / Dark)
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    AppState.theme = next;
    Utils.storage.set('theme', next);

    const themeBtnText = document.getElementById('theme-toggle-text');
    if (themeBtnText) {
      themeBtnText.textContent = next === 'dark' ? 'Forest Dark (Active)' : 'Emerald Light (Active)';
    }
    this.showToast(`Switched to ${next === 'dark' ? 'Deep Forest' : 'Emerald Light'} Theme`, 'info');
  },

  // Setup Global DOM Event Listeners
  initEventListeners() {
    // Navigation items (Bottom bar & Desktop sidebar)
    document.querySelectorAll('[data-screen]').forEach((el) => {
      el.addEventListener('click', (e) => {
        const screen = e.currentTarget.dataset.screen;
        if (screen) UI.navigateTo(screen);
      });
    });

    // Close modal on overlay click outside sheet
    document.querySelectorAll('.modal-overlay').forEach((overlay) => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });

    // Close buttons inside modals
    document.querySelectorAll('.modal-close-trigger').forEach((btn) => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) {
          modal.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });

    // Profile Card Selection in Screen 0
    document.querySelectorAll('.profile-card-select').forEach((card) => {
      card.addEventListener('click', async (e) => {
        const user = card.dataset.user;
        if (user) {
          await AppState.setCurrentUser(user);
          const screen0 = document.getElementById('user-selection-screen');
          if (screen0) screen0.classList.add('hidden');
          UI.navigateTo('home');
          UI.showToast(`Welcome back, ${user === 'hemnath' ? 'Hemnath' : 'Velu'}! 🏃`, 'success');
        }
      });
    });

    // FAB Button on click
    const fab = document.getElementById('global-fab-btn');
    if (fab) {
      fab.addEventListener('click', () => {
        if (AppState.currentScreen === 'tasks') {
          if (window.TasksView) TasksView.openAddTaskModal();
        } else {
          if (window.HabitsView) HabitsView.openAddHabitModal();
        }
      });
    }

    // Network online/offline detection
    window.addEventListener('online', () => {
      const banner = document.getElementById('offline-banner');
      if (banner) banner.classList.remove('active');
      UI.showToast('Back online! Syncing with Google Sheets...', 'success');
      AppState.loadUserData().then(() => UI.renderCurrentScreen());
      UI.updateSyncStatus();
    });

    window.addEventListener('offline', () => {
      const banner = document.getElementById('offline-banner');
      if (banner) banner.classList.add('active');
      UI.showToast('You are offline. Changes cached locally.', 'info');
      UI.updateSyncStatus();
    });

    // Tab visibility change (refresh data when returning to tab)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && AppState.currentUser) {
        AppState.loadUserData().then(() => UI.renderCurrentScreen());
      }
    });

    // Listen to AppState notifications
    AppState.subscribe((state, changeType) => {
      if (changeType === 'USER_CHANGED' || changeType === 'HABITS_UPDATED' || changeType === 'TASKS_UPDATED') {
        UI.renderCurrentScreen();
        UI.updateHeaderInfo();
      }
    });
  },

  // Update App Header User Avatar & Text
  updateHeaderInfo() {
    const user = AppState.getCurrentUserObj();
    if (!user) return;

    const avatarImg = document.getElementById('header-avatar-img');
    if (avatarImg) avatarImg.src = user.avatar;

    const greetingTitle = document.getElementById('header-greeting-title');
    if (greetingTitle) greetingTitle.textContent = Utils.getGreeting(user.name);

    const sidebarAvatar = document.getElementById('sidebar-user-avatar');
    if (sidebarAvatar) sidebarAvatar.src = user.avatar;

    const sidebarName = document.getElementById('sidebar-user-name');
    if (sidebarName) sidebarName.textContent = user.name;
  },
};

window.UI = UI;
