/* ==========================================================================
   GreenLife - Screen 6: Profile & Backend Settings (profile.js)
   Athlete Profiles, Switch User, Google Apps Script Endpoint Config & Theme
   ========================================================================== */

const ProfileView = {
  render() {
    const container = document.getElementById('screen-profile');
    if (!container) return;

    const user = AppState.getCurrentUserObj();
    if (!user) return;

    const stats = AppState.statistics;
    const isHemnath = user.userId === 'hemnath';
    const otherUser = isHemnath ? 'Velu' : 'Hemnath';
    const otherUserId = isHemnath ? 'velu' : 'hemnath';

    const currentEndpoint = API.getEndpoint();
    const isCustomEndpoint = !!Utils.storage.get('custom_api_endpoint');

    container.innerHTML = `
      <!-- Athlete Profile Hero Banner -->
      <div class="profile-hero">
        <div class="profile-avatar-wrap">
          <img class="profile-hero-avatar" id="profile-avatar-img" src="${user.avatar}" alt="${user.name}" />
          <label class="avatar-upload-btn" id="avatar-upload-label" title="Change profile photo">
            📷
            <input type="file" id="avatar-file-input" accept="image/png, image/jpeg, image/webp" />
          </label>
        </div>
        <div class="profile-hero-name">${user.name}</div>
        <div class="profile-hero-sub">${user.role || 'Athlete & High Performer'}</div>

        <button class="profile-switch-btn" id="prof-switch-user-btn">
          🔄 Switch to ${otherUser}
        </button>
      </div>

      <!-- User Stats Summary -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon-wrapper">🔥</div>
          <div class="stat-val">${stats.currentStreak || 0}</div>
          <div class="stat-label">Active Streak</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper">🎯</div>
          <div class="stat-val">${AppState.habits.length}</div>
          <div class="stat-label">Total Habits</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper">✅</div>
          <div class="stat-val">${stats.totalTasksCompleted || 0}</div>
          <div class="stat-label">Tasks Done</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper">📈</div>
          <div class="stat-val">${stats.habitSuccessRate || 0}%</div>
          <div class="stat-label">Success Rate</div>
        </div>
      </div>

      <!-- Settings & Controls List -->
      <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text); margin: 24px 0 12px;">
        Application & Backend Settings
      </h3>

      <div class="settings-list">
        <!-- Switch Profile Option -->
        <div class="settings-item" id="setting-switch-profile">
          <div class="settings-item-left">
            <div class="settings-item-icon">👥</div>
            <div>
              <div class="settings-item-title">Switch User Profile</div>
              <div class="settings-item-desc">Currently signed in as ${user.name}. Switch to ${otherUser}.</div>
            </div>
          </div>
          <span style="font-weight: 700; color: var(--primary); font-size: 0.9rem;">Switch →</span>
        </div>

        <!-- Google Apps Script Config Option -->
        <div class="settings-item" id="setting-backend-config">
          <div class="settings-item-left">
            <div class="settings-item-icon">☁️</div>
            <div>
              <div class="settings-item-title">Google Sheets Web API</div>
              <div class="settings-item-desc">${isCustomEndpoint ? 'Custom Web App Deployed' : 'Default Apps Script Endpoint'}</div>
            </div>
          </div>
          <span style="font-weight: 700; color: var(--primary); font-size: 0.85rem;">Configure</span>
        </div>

        <!-- View Apps Script Code & Setup Docs -->
        <div class="settings-item" id="setting-view-code">
          <div class="settings-item-left">
            <div class="settings-item-icon">📜</div>
            <div>
              <div class="settings-item-title">Google Sheets & Code.gs Setup</div>
              <div class="settings-item-desc">View backend script, table columns & deploy guide</div>
            </div>
          </div>
          <span style="font-weight: 700; color: var(--primary); font-size: 0.85rem;">View</span>
        </div>

        <!-- Theme Mode Toggle -->
        <div class="settings-item" id="setting-theme-toggle">
          <div class="settings-item-left">
            <div class="settings-item-icon">🌓</div>
            <div>
              <div class="settings-item-title">Appearance Theme</div>
              <div class="settings-item-desc" id="theme-toggle-text">
                ${AppState.theme === 'dark' ? 'Forest Dark (Active)' : 'Emerald Light (Active)'}
              </div>
            </div>
          </div>
          <span style="font-weight: 700; color: var(--primary); font-size: 0.85rem;">Toggle</span>
        </div>

        <!-- Backup Data JSON -->
        <div class="settings-item" id="setting-export-backup">
          <div class="settings-item-left">
            <div class="settings-item-icon">💾</div>
            <div>
              <div class="settings-item-title">Export / Backup Profile Data</div>
              <div class="settings-item-desc">Download JSON snapshot for ${user.name}</div>
            </div>
          </div>
          <span style="font-weight: 700; color: var(--primary); font-size: 0.85rem;">Export</span>
        </div>

        <!-- Sync Now -->
        <div class="settings-item" id="setting-sync-now">
          <div class="settings-item-left">
            <div class="settings-item-icon">🔄</div>
            <div>
              <div class="settings-item-title">Manual Cloud Refresh</div>
              <div class="settings-item-desc">Fetch freshest records from Google Sheets backend</div>
            </div>
          </div>
          <span style="font-weight: 700; color: var(--primary); font-size: 0.85rem;">Sync Now</span>
        </div>
      </div>
    `;

    this.bindEvents(otherUserId, otherUser);
  },

  bindEvents(otherUserId, otherUser) {
    // Switch User button in Hero
    const switchHeroBtn = document.getElementById('prof-switch-user-btn');
    if (switchHeroBtn) {
      switchHeroBtn.addEventListener('click', () => this.handleUserSwitch(otherUserId, otherUser));
    }

    const switchItem = document.getElementById('setting-switch-profile');
    if (switchItem) {
      switchItem.addEventListener('click', () => this.handleUserSwitch(otherUserId, otherUser));
    }

    // Backend Config Modal
    const backendBtn = document.getElementById('setting-backend-config');
    if (backendBtn) {
      backendBtn.addEventListener('click', () => {
        document.getElementById('api-url-input').value = API.getEndpoint();
        UI.openModal('modal-backend-config');
      });
    }

    // View Code Modal
    const viewCodeBtn = document.getElementById('setting-view-code');
    if (viewCodeBtn) {
      viewCodeBtn.addEventListener('click', () => {
        UI.openModal('modal-appscript-code');
      });
    }

    // Theme Toggle
    const themeBtn = document.getElementById('setting-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        UI.toggleTheme();
        this.render();
      });
    }

    // Export Backup
    const exportBtn = document.getElementById('setting-export-backup');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportUserData());
    }

    // Sync Now
    const syncBtn = document.getElementById('setting-sync-now');
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        UI.showToast('Fetching latest records from Google Sheets...', 'info');
        await AppState.loadUserData();
        UI.showToast('Data refreshed successfully!', 'success');
        this.render();
      });
    }

    // Profile Photo Upload
    const avatarInput = document.getElementById('avatar-file-input');
    if (avatarInput) {
      avatarInput.addEventListener('change', (e) => this.handleAvatarUpload(e));
    }
  },

  // Resize + compress an uploaded image, then save it as the user's avatar
  async handleAvatarUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      UI.showToast('Please choose an image file.', 'error');
      return;
    }

    try {
      const dataUrl = await this.resizeImageToDataUrl(file, 240);
      const user = AppState.getCurrentUserObj();

      // Optimistic UI update everywhere the avatar is shown
      const previewImg = document.getElementById('profile-avatar-img');
      if (previewImg) previewImg.src = dataUrl;
      const found = AppState.users.find((u) => u.userId === user.userId);
      if (found) found.avatar = dataUrl;
      UI.updateHeaderInfo();

      UI.showToast('Uploading photo...', 'info');
      const res = await API.updateUserAvatar(user.userId, dataUrl);
      if (res.success) {
        UI.showToast('Profile photo updated!', 'success');
      } else {
        UI.showToast('Saved locally — could not reach Google Sheets.', 'info');
      }
    } catch (err) {
      console.error('[Profile] Avatar upload failed:', err);
      UI.showToast('Could not process that image.', 'error');
    } finally {
      e.target.value = '';
    }
  },

  // Downscale an image file to a small square JPEG data URL so it fits
  // comfortably inside a single Google Sheets cell.
  resizeImageToDataUrl(file, maxSize = 240) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not decode image'));
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          canvas.width = maxSize;
          canvas.height = maxSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  },

  async handleUserSwitch(targetUserId, targetName) {
    UI.showConfirm(
      `Switch profile to ${targetName}?`,
      `Your current session will switch completely to ${targetName}. No data will be mixed.`,
      async () => {
        UI.showToast(`Loading ${targetName}'s profile...`, 'info');
        await AppState.setCurrentUser(targetUserId);
        UI.showToast(`Active profile: ${targetName} 🏃`, 'success');
        UI.navigateTo('home');
      }
    );
  },

  exportUserData() {
    const user = AppState.getCurrentUserObj();
    const exportPayload = {
      user,
      exportedAt: new Date().toISOString(),
      habits: AppState.habits,
      habitLogs: AppState.habitLogs,
      tasks: AppState.tasks,
      statistics: AppState.statistics,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `greenlife_${user.userId}_backup_${Utils.formatDate()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    UI.showToast(`Exported backup for ${user.name}!`, 'success');
  },
};

window.ProfileView = ProfileView;