/* ==========================================================================
   GreenLife - Screen 4: Progress Calendar (calendar.js)
   Dynamic Vanilla JS Monthly Grid, Habit Heatmap Dots & Date Inspector
   ========================================================================== */

const CalendarView = {
  currentViewDate: new Date(),

  render() {
    const container = document.getElementById('screen-calendar');
    if (!container) return;

    const year = this.currentViewDate.getFullYear();
    const month = this.currentViewDate.getMonth();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const activeHabits = AppState.habits.filter((h) => h.active);
    const selectedDate = AppState.selectedDate;

    // Generate Calendar Grid Days
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Normalize so Monday is index 0
    const startOffset = (firstDayIndex + 6) % 7;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let gridHtml = '';

    // Previous month filler days
    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      gridHtml += `
        <div class="calendar-day-cell other-month">
          <span>${dayNum}</span>
        </div>
      `;
    }

    const todayStr = Utils.formatDate(new Date());

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = dateStr === selectedDate;
      const isToday = dateStr === todayStr;

      // Calculate completion for this date
      const dateLogs = AppState.habitLogs.filter((l) => l.date === dateStr && l.completed);
      const totalActive = activeHabits.length;

      let dotClass = 'dot-none';
      if (totalActive > 0 && dateLogs.length > 0) {
        if (dateLogs.length >= totalActive) {
          dotClass = 'dot-full';
        } else {
          dotClass = 'dot-partial';
        }
      }

      // Check tasks
      const hasTasks = AppState.tasks.some((t) => t.date === dateStr);

      gridHtml += `
        <div 
          class="calendar-day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today-cell' : ''}" 
          data-date="${dateStr}"
          title="${dateStr}"
        >
          <span>${day}</span>
          <div class="day-activity-dot ${dotClass}"></div>
          ${hasTasks ? `<span style="font-size: 8px; position: absolute; top: 2px; right: 4px;">📌</span>` : ''}
        </div>
      `;
    }

    // Selected Date Details
    const inspectLogs = AppState.habitLogs.filter((l) => l.date === selectedDate && l.completed);
    const inspectTasks = AppState.tasks.filter((t) => t.date === selectedDate);
    const completedInspectHabits = activeHabits.filter((h) =>
      inspectLogs.some((l) => l.habitId === h.habitId)
    );

    const dayPercent = activeHabits.length > 0 ? Math.round((completedInspectHabits.length / activeHabits.length) * 100) : 0;

    container.innerHTML = `
      <!-- Screen Header -->
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text);">Calendar Progress</h2>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Visualize consistency history & daily breakdowns</p>
      </div>

      <!-- Calendar Main Card -->
      <div class="calendar-card">
        <div class="calendar-header">
          <div class="calendar-month-title">${monthNames[month]} ${year}</div>
          <div class="calendar-nav-controls">
            <button class="icon-btn" id="cal-prev-month-btn" title="Previous month">◀</button>
            <button class="btn-secondary" id="cal-today-btn" style="width: auto; padding: 6px 12px; margin: 0; font-size: 0.8rem;">Today</button>
            <button class="icon-btn" id="cal-next-month-btn" title="Next month">▶</button>
          </div>
        </div>

        <div class="calendar-grid" style="margin-bottom: 10px;">
          <div class="calendar-weekday">MON</div>
          <div class="calendar-weekday">TUE</div>
          <div class="calendar-weekday">WED</div>
          <div class="calendar-weekday">THU</div>
          <div class="calendar-weekday">FRI</div>
          <div class="calendar-weekday">SAT</div>
          <div class="calendar-weekday">SUN</div>
        </div>

        <div class="calendar-grid">
          ${gridHtml}
        </div>

        <!-- Legend -->
        <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; font-size: 0.75rem; color: var(--text-muted);">
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span> 100% Completed
          </span>
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #6ee7b7;"></span> Partial
          </span>
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--border);"></span> Inactive
          </span>
        </div>
      </div>

      <!-- Date Detail Inspector Box -->
      <div class="date-detail-box">
        <div class="date-detail-header">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text);">
              ${Utils.formatDisplayDate(selectedDate)}
            </h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              ${completedInspectHabits.length} of ${activeHabits.length} Habits Completed (${dayPercent}%)
            </span>
          </div>
          <span class="habit-badge" style="background: var(--primary-light); color: var(--primary-dark); font-weight: 800;">
            ${dayPercent}% Day Rate
          </span>
        </div>

        <!-- Day Habits Breakdown -->
        <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px;">
          Habits Logged
        </h4>
        <div class="habits-list" style="margin-bottom: 18px;">
          ${
            activeHabits.length === 0
              ? `<div style="font-size: 0.82rem; color: var(--text-muted);">No active habits configured.</div>`
              : activeHabits
                  .map((h) => {
                    const isDone = inspectLogs.some((l) => l.habitId === h.habitId);
                    return `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--surface-subtle); border-radius: var(--radius-md); font-size: 0.88rem;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span>${h.icon || '🏃‍♂️'}</span>
                  <span style="font-weight: 600; color: var(--text);">${h.name}</span>
                </div>
                <span style="font-size: 0.8rem; font-weight: 700; color: ${isDone ? 'var(--primary)' : 'var(--text-muted)'};">
                  ${isDone ? '✓ Completed' : 'Not completed'}
                </span>
              </div>
            `;
                  })
                  .join('')
          }
        </div>

        <!-- Day Tasks Breakdown -->
        <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--text-secondary); margin-bottom: 8px;">
          Tasks for this day (${inspectTasks.length})
        </h4>
        <div class="tasks-list">
          ${
            inspectTasks.length === 0
              ? `<div style="font-size: 0.82rem; color: var(--text-muted);">No tasks scheduled for this day.</div>`
              : inspectTasks
                  .map(
                    (t) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--surface-subtle); border-radius: var(--radius-md); font-size: 0.88rem;">
                <span style="font-weight: 600; ${t.completed ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${t.title}</span>
                <span class="priority-badge priority-${(t.priority || 'medium').toLowerCase()}">${t.priority || 'Medium'}</span>
              </div>
            `
                  )
                  .join('')
          }
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    // Month navigation buttons
    const prevBtn = document.getElementById('cal-prev-month-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.currentViewDate.setMonth(this.currentViewDate.getMonth() - 1);
        this.render();
      });
    }

    const nextBtn = document.getElementById('cal-next-month-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.currentViewDate.setMonth(this.currentViewDate.getMonth() + 1);
        this.render();
      });
    }

    const todayBtn = document.getElementById('cal-today-btn');
    if (todayBtn) {
      todayBtn.addEventListener('click', () => {
        this.currentViewDate = new Date();
        AppState.setSelectedDate(Utils.formatDate(new Date()));
        this.render();
      });
    }

    // Day cell click selection
    document.querySelectorAll('.calendar-day-cell[data-date]').forEach((cell) => {
      cell.addEventListener('click', (e) => {
        const date = e.currentTarget.dataset.date;
        if (date) {
          AppState.setSelectedDate(date);
          this.render();
        }
      });
    });
  },
};

window.CalendarView = CalendarView;
