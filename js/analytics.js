/* ==========================================================================
   GreenLife - Screen 5: Analytics & Insights (analytics.js)
   Streaks, Success Rates, Consistency Bar Charts & Category Distribution
   ========================================================================== */

const AnalyticsView = {
  render() {
    const container = document.getElementById('screen-analytics');
    if (!container) return;

    const stats = AppState.statistics;
    const currentWeek = Utils.getWeekDays(new Date());
    const activeHabits = AppState.habits.filter((h) => h.active);

    // Compute weekly day-by-day percentages for SVG bar chart
    const weekData = currentWeek.map((day) => {
      const dayLogs = AppState.habitLogs.filter((l) => l.date === day.dateStr && l.completed);
      const total = activeHabits.length;
      const pct = total > 0 ? Math.min(100, Math.round((dayLogs.length / total) * 100)) : 0;
      return {
        label: day.label,
        dateStr: day.dateStr,
        percentage: pct,
        isToday: day.isToday,
      };
    });

    // Compute category breakdown
    const categoryCounts = {};
    AppState.habits.forEach((h) => {
      const cat = h.category || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // Generate Weekly SVG Bar Chart
    const barWidth = 32;
    const chartHeight = 130;
    const spacing = 48;
    const svgWidth = currentWeek.length * spacing + 20;

    const barsSvg = weekData
      .map((d, i) => {
        const x = 20 + i * spacing;
        const bHeight = Math.max(4, Math.round((d.percentage / 100) * (chartHeight - 30)));
        const y = chartHeight - bHeight - 10;
        const fillColor = d.isToday ? '#059669' : '#10b981';

        return `
          <g>
            <rect 
              x="${x}" 
              y="${chartHeight - 10 - (chartHeight - 30)}" 
              width="${barWidth}" 
              height="${chartHeight - 30}" 
              rx="6" 
              fill="var(--surface-subtle)" 
            />
            <rect 
              x="${x}" 
              y="${y}" 
              width="${barWidth}" 
              height="${bHeight}" 
              rx="6" 
              fill="${fillColor}" 
            />
            <text 
              x="${x + barWidth / 2}" 
              y="${y - 4}" 
              font-size="10" 
              font-weight="bold" 
              fill="var(--text)" 
              text-anchor="middle"
            >${d.percentage}%</text>
            <text 
              x="${x + barWidth / 2}" 
              y="${chartHeight + 12}" 
              font-size="11" 
              font-weight="700" 
              fill="${d.isToday ? 'var(--primary-dark)' : 'var(--text-muted)'}" 
              text-anchor="middle"
            >${d.label}</text>
          </g>
        `;
      })
      .join('');

    container.innerHTML = `
      <!-- Screen Header -->
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text);">Analytics & Performance</h2>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Real-time metrics powered by Google Sheets backend</p>
      </div>

      <!-- Key Metrics 4-Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon-wrapper">🔥</div>
          <div class="stat-val">${stats.currentStreak || 0}</div>
          <div class="stat-label">Current Streak (Days)</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper" style="background: #fef3c7; color: #d97706;">🏆</div>
          <div class="stat-val">${stats.longestStreak || 0}</div>
          <div class="stat-label">Longest Streak (Days)</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper" style="background: #dbeafe; color: #2563eb;">📈</div>
          <div class="stat-val">${stats.habitSuccessRate || 0}%</div>
          <div class="stat-label">Habit Success Rate</div>
        </div>

        <div class="stat-card">
          <div class="stat-icon-wrapper" style="background: #e0e7ff; color: #4f46e5;">📋</div>
          <div class="stat-val">${stats.totalTasksCompleted || 0}</div>
          <div class="stat-label">Tasks Completed</div>
        </div>
      </div>

      <!-- Weekly Habit Consistency Chart -->
      <div class="chart-card">
        <div class="card-header">
          <div class="card-title">
            <span>📊</span> Weekly Consistency Trend
          </div>
          <span class="today-chip">This Week</span>
        </div>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px;">
          Daily percentage of habits marked complete across the current week.
        </p>

        <div style="overflow-x: auto; width: 100%; text-align: center;">
          <svg viewBox="0 0 ${svgWidth} ${chartHeight + 24}" style="width: 100%; max-width: 480px; height: 180px; margin: 0 auto; display: block;">
            ${barsSvg}
          </svg>
        </div>
      </div>

      <!-- Habit by Habit Breakdown -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>⚡</span> Habit Performance Ranks
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          ${
            activeHabits.length === 0
              ? `<div style="font-size: 0.85rem; color: var(--text-muted);">No active habits to analyze.</div>`
              : activeHabits
                  .map((h) => {
                    const streak = Utils.calculateHabitStreak(AppState.habitLogs, h.habitId);
                    const completedLogs = AppState.habitLogs.filter((l) => l.habitId === h.habitId && l.completed);
                    const pct = Math.min(100, Math.round((completedLogs.length / 14) * 100));

                    return `
              <div>
                <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.88rem; font-weight: 700; margin-bottom: 4px;">
                  <span style="display: flex; align-items: center; gap: 6px;">
                    ${h.icon || '🏃‍♂️'} ${h.name}
                  </span>
                  <span style="color: var(--primary-dark); font-size: 0.82rem;">
                    🔥 ${streak}d streak • ${pct}%
                  </span>
                </div>
                <div class="progress-bar-container">
                  <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                </div>
              </div>
            `;
                  })
                  .join('')
          }
        </div>
      </div>

      <!-- Category Distribution -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">
            <span>🎯</span> Routine Focus Categories
          </div>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${Object.entries(categoryCounts)
            .map(
              ([cat, count]) => `
            <div style="padding: 10px 14px; background: var(--surface-subtle); border-radius: var(--radius-lg); border: 1px solid var(--border); display: flex; align-items: center; gap: 8px; font-size: 0.85rem; font-weight: 700;">
              <span>${cat}</span>
              <span class="habit-badge" style="background: var(--primary); color: #fff;">${count}</span>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  },
};

window.AnalyticsView = AnalyticsView;
