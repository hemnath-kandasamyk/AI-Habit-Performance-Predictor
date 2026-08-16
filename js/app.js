/* ==========================================================================
   GreenLife - Application Entry Point & Orchestrator (app.js)
   Vanilla JavaScript Startup, Polling Sync & Global Form Handlers
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[GreenLife] Initializing Personal Habit Tracker & Task Management System...');

  // Apply saved theme
  const savedTheme = Utils.storage.get('theme', 'light');
  document.documentElement.setAttribute('data-theme', savedTheme);
  AppState.theme = savedTheme;

  // Initialize UI event listeners
  UI.initEventListeners();

  // Bind Habit Form Submit
  const habitForm = document.getElementById('habit-form');
  if (habitForm) {
    habitForm.addEventListener('submit', (e) => HabitsView.handleHabitFormSubmit(e));
  }

  // Bind Habit Icon Presets
  document.querySelectorAll('.icon-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      HabitsView.setSelectedIcon(btn.dataset.icon);
    });
  });

  // Bind Habit Frequency Pills
  document.querySelectorAll('#habit-freq-pills .freq-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      HabitsView.setSelectedFrequency(pill.dataset.freq);
    });
  });

  // Bind Task Form Submit
  const taskForm = document.getElementById('task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', (e) => TasksView.handleTaskFormSubmit(e));
  }

  // Bind Backend Config Form Submit
  const apiForm = document.getElementById('api-config-form');
  if (apiForm) {
    apiForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const url = document.getElementById('api-url-input').value.trim();
      API.setEndpoint(url);
      UI.closeModal('modal-backend-config');
      UI.showToast('Google Sheets API endpoint updated!', 'success');
      UI.updateSyncStatus();
      AppState.loadUserData().then(() => UI.renderCurrentScreen());
    });
  }

  const testApiBtn = document.getElementById('test-api-btn');
  if (testApiBtn) {
    testApiBtn.addEventListener('click', async () => {
      const url = document.getElementById('api-url-input').value.trim();
      testApiBtn.textContent = 'Testing...';
      testApiBtn.disabled = true;
      try {
        const testRes = await fetch(`${url}?action=getUsers`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          redirect: 'follow',
        });
        const json = await testRes.json();
        if (json.success || Array.isArray(json.data)) {
          UI.showToast('Connection to Google Apps Script successful! 🟢', 'success');
        } else {
          UI.showToast('Connected, but unexpected format. Using with fallback.', 'info');
        }
      } catch (err) {
        UI.showToast('Could not reach Web App URL directly (CORS/Permissions). Changes will still save locally and sync seamlessly!', 'info');
      } finally {
        testApiBtn.textContent = 'Test Endpoint';
        testApiBtn.disabled = false;
      }
    });
  }

  // Populate full Code.gs snippet in viewer
  fetch('/backend/Code.gs')
    .then((res) => (res.ok ? res.text() : null))
    .then((code) => {
      if (code) {
        const codeBlock = document.getElementById('appscript-code-block');
        if (codeBlock) codeBlock.textContent = code;
      }
    })
    .catch(() => {});

  // Copy Code.gs snippet button
  const copyCodeBtn = document.getElementById('copy-appscript-btn');
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener('click', () => {
      const codeSnippet = document.getElementById('appscript-code-block').textContent;
      navigator.clipboard.writeText(codeSnippet).then(() => {
        UI.showToast('Apps Script code copied to clipboard!', 'success');
      });
    });
  }

  // Check saved user
  const savedUser = Utils.storage.get('currentUser');
  const userSelectScreen = document.getElementById('user-selection-screen');

  if (savedUser && (savedUser === 'hemnath' || savedUser === 'velu')) {
    // Hide user selection overlay
    if (userSelectScreen) userSelectScreen.classList.add('hidden');
    await AppState.setCurrentUser(savedUser);
    UI.navigateTo('home');
  } else {
    // Show Screen 0 (User Selection)
    if (userSelectScreen) userSelectScreen.classList.remove('hidden');
  }

  // Setup periodic lightweight auto-sync (every 45 seconds)
  setInterval(() => {
    if (AppState.currentUser && navigator.onLine && !document.hidden) {
      console.log('[GreenLife] Running periodic background synchronization...');
      AppState.loadUserData().then(() => {
        UI.updateSyncStatus();
      });
    }
  }, 45000);
});
