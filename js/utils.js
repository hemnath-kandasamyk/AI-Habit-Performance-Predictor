/* ==========================================================================
   GreenLife - Utilities (utils.js)
   Vanilla JavaScript Helper Functions
   ========================================================================== */

const Utils = {
  // Generate unique IDs matching format HAB-YYYYMMDD-XXX or TASK-YYYYMMDD-XXX
  generateId(prefix = 'REC') {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${yyyy}${mm}${dd}-${rand}`;
  },

  // Format Date object to YYYY-MM-DD
  formatDate(date = new Date()) {
    const d = new Date(date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  // Parse YYYY-MM-DD safely into Date (avoiding UTC timezone shift)
  parseLocalDate(dateStr) {
    if (!dateStr) return new Date();
    if (typeof dateStr === 'object' && dateStr instanceof Date) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(dateStr);
  },

  // Format date to human friendly string: "Sunday, Aug 16" or "Today"
  formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const todayStr = this.formatDate(new Date());
    if (dateStr === todayStr) return 'Today';

    const d = this.parseLocalDate(dateStr);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateStr === this.formatDate(yesterday)) return 'Yesterday';

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateStr === this.formatDate(tomorrow)) return 'Tomorrow';

    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  },

  // Dynamic greeting based on time of day
  getGreeting(name = '') {
    const hour = new Date().getHours();
    let timeGreeting = 'Good Morning';
    let icon = '🌅';
    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good Afternoon';
      icon = '☀️';
    } else if (hour >= 17) {
      timeGreeting = 'Good Evening';
      icon = '🌙';
    }
    return `${timeGreeting}, ${name} ${icon}`;
  },

  // Get current week array (Monday to Sunday) for any given date
  getWeekDays(dateObj = new Date()) {
    const curr = new Date(dateObj);
    // Day: 0 is Sunday, 1 is Monday ... 6 is Saturday
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(curr.setDate(diff));

    const week = [];
    const shortNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      const dateStr = this.formatDate(nextDay);
      week.push({
        dateStr,
        label: shortNames[i],
        dayNum: nextDay.getDate(),
        isToday: dateStr === this.formatDate(new Date()),
      });
    }
    return week;
  },

  // Calculate circular progress ring stroke offset
  calculateRingOffset(percent, radius = 42) {
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, percent));
    const offset = circumference - (clamped / 100) * circumference;
    return { circumference, offset };
  },

  // Debounce helper
  debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Local Storage with safe JSON parsing
  storage: {
    get(key, fallback = null) {
      try {
        const item = localStorage.getItem(`greenlife_${key}`);
        return item ? JSON.parse(item) : fallback;
      } catch (e) {
        console.warn('Storage get error for key:', key, e);
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(`greenlife_${key}`, JSON.stringify(value));
      } catch (e) {
        console.warn('Storage set error for key:', key, e);
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(`greenlife_${key}`);
      } catch (e) {
        console.warn('Storage remove error:', e);
      }
    },
  },

  // Calculate streak for a specific habit
  calculateHabitStreak(habitLogs, habitId) {
    if (!Array.isArray(habitLogs)) return 0;
    const completedDates = habitLogs
      .filter((log) => log.habitId === habitId && log.completed)
      .map((log) => log.date)
      .sort()
      .reverse();

    if (completedDates.length === 0) return 0;

    const todayStr = this.formatDate(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = this.formatDate(yesterday);

    // If today is completed or yesterday was completed, streak is alive
    const hasToday = completedDates.includes(todayStr);
    const hasYesterday = completedDates.includes(yesterdayStr);

    if (!hasToday && !hasYesterday) {
      return 0;
    }

    let streak = 0;
    let checkDate = hasToday ? new Date() : yesterday;

    while (true) {
      const checkStr = this.formatDate(checkDate);
      if (completedDates.includes(checkStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  },

  // High performance Canvas Confetti Particle Burst for habit completion
  triggerConfetti(originX = window.innerWidth / 2, originY = window.innerHeight / 2) {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#10b981', '#34d399', '#6ee7b7', '#059669', '#f59e0b', '#ffffff'];

    for (let i = 0; i < 42; i++) {
      particles.push({
        x: originX,
        y: originY,
        r: Math.random() * 5 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.8) * 12,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015,
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      particles.forEach((p) => {
        if (p.alpha > 0) {
          active = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.25; // gravity
          p.alpha -= p.decay;

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      if (active) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    animate();
  },

  // High quality athlete SVG avatars
  athleteAvatars: {
    hemnath: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <defs>
        <radialGradient id="bgH" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="%2310b981"/>
          <stop offset="60%" stop-color="%23064e3b"/>
          <stop offset="100%" stop-color="%23042f24"/>
        </radialGradient>
        <linearGradient id="skinH" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="%23e0a97b"/>
          <stop offset="100%" stop-color="%23b8794c"/>
        </linearGradient>
        <linearGradient id="jerseyH" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="%23059669"/>
          <stop offset="100%" stop-color="%23022c22"/>
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(%23bgH)"/>
      <!-- Athletic Shoulders & Jersey -->
      <path d="M30 200 C30 145 60 135 100 135 C140 135 170 145 170 200 Z" fill="url(%23jerseyH)"/>
      <path d="M70 135 L100 160 L130 135 Z" fill="%2334d399" opacity="0.3"/>
      <!-- Neck -->
      <rect x="85" y="110" width="30" height="35" fill="url(%23skinH)" rx="6"/>
      <!-- Head -->
      <ellipse cx="100" cy="85" rx="38" ry="46" fill="url(%23skinH)"/>
      <!-- Athletic Headband -->
      <rect x="62" y="60" width="76" height="12" fill="%2310b981" rx="4"/>
      <line x1="62" y1="66" x2="138" y2="66" stroke="%23ffffff" stroke-width="2"/>
      <!-- Athletic Hair -->
      <path d="M62 65 C60 40 80 30 100 30 C120 30 140 40 138 65 C132 50 115 42 100 42 C85 42 68 50 62 65 Z" fill="%231e293b"/>
      <!-- Eyes & Brows -->
      <path d="M78 74 Q88 72 94 76" stroke="%230f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M106 76 Q112 72 122 74" stroke="%230f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
      <circle cx="86" cy="83" r="4.5" fill="%230f172a"/>
      <circle cx="114" cy="83" r="4.5" fill="%230f172a"/>
      <circle cx="87.5" cy="81.5" r="1.5" fill="%23ffffff"/>
      <circle cx="115.5" cy="81.5" r="1.5" fill="%23ffffff"/>
      <!-- Nose & Smile -->
      <path d="M97 86 L100 96 L104 96" stroke="%23935832" stroke-width="2" stroke-linecap="round" fill="none"/>
      <path d="M88 108 Q100 118 112 108" stroke="%23713f20" stroke-width="3" stroke-linecap="round" fill="none"/>
      <!-- Athletic Trim -->
      <circle cx="100" cy="180" r="12" fill="%2334d399"/>
      <text x="100" y="185" font-family="Arial" font-weight="bold" font-size="12" fill="%23064e3b" text-anchor="middle">H</text>
    </svg>`,

    velu: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
      <defs>
        <radialGradient id="bgV" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="%23059669"/>
          <stop offset="60%" stop-color="%23022c22"/>
          <stop offset="100%" stop-color="%23011a14"/>
        </radialGradient>
        <linearGradient id="skinV" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="%23f0bf91"/>
          <stop offset="100%" stop-color="%23c48a58"/>
        </linearGradient>
        <linearGradient id="jerseyV" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="%2310b981"/>
          <stop offset="100%" stop-color="%23043828"/>
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="100" fill="url(%23bgV)"/>
      <!-- Athletic Shoulders & High Neck Compression Shirt -->
      <path d="M28 200 C28 142 58 132 100 132 C142 132 172 142 172 200 Z" fill="url(%23jerseyV)"/>
      <path d="M80 132 L100 155 L120 132 Z" fill="%236ee7b7" opacity="0.4"/>
      <!-- Neck -->
      <rect x="86" y="108" width="28" height="34" fill="url(%23skinV)" rx="5"/>
      <!-- Head -->
      <ellipse cx="100" cy="83" rx="37" ry="45" fill="url(%23skinV)"/>
      <!-- Athletic Modern Taper Hair -->
      <path d="M63 70 C60 36 78 26 100 26 C122 26 140 36 137 70 C130 52 118 40 100 40 C82 40 70 52 63 70 Z" fill="%230f172a"/>
      <!-- Runner Cap / Modern Style -->
      <path d="M60 56 Q100 46 140 56 L142 62 Q100 52 58 62 Z" fill="%236ee7b7"/>
      <!-- Eyes & Focus Brows -->
      <path d="M76 74 Q86 70 93 75" stroke="%230f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      <path d="M107 75 Q114 70 124 74" stroke="%230f172a" stroke-width="3.2" stroke-linecap="round" fill="none"/>
      <circle cx="85" cy="82" r="4.5" fill="%230f172a"/>
      <circle cx="115" cy="82" r="4.5" fill="%230f172a"/>
      <circle cx="86.5" cy="80.5" r="1.5" fill="%23ffffff"/>
      <circle cx="116.5" cy="80.5" r="1.5" fill="%23ffffff"/>
      <!-- Athletic Jaw & Determination Smile -->
      <path d="M97 85 L100 95 L103 95" stroke="%239a5f35" stroke-width="2" stroke-linecap="round" fill="none"/>
      <path d="M87 106 Q100 115 113 106" stroke="%23713f20" stroke-width="3" stroke-linecap="round" fill="none"/>
      <!-- Athletic Jersey Number Badge -->
      <circle cx="100" cy="180" r="12" fill="%236ee7b7"/>
      <text x="100" y="185" font-family="Arial" font-weight="bold" font-size="12" fill="%23043828" text-anchor="middle">V</text>
    </svg>`,
  },
};

window.Utils = Utils;
