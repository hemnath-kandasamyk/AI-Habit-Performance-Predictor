/**
 * ============================================================================
 * GreenLife - Google Apps Script Backend (Code.gs)
 * Personal Habit Tracker & Task Management System for Hemnath & Velu
 * Stores and serves all app data (Users, Habits, HabitLogs, Tasks) from
 * Google Sheets. No mock/demo data — every row is real data created by
 * the app itself.
 * ============================================================================
 *
 * SETUP INSTRUCTIONS
 * -------------------
 * 1. Go to https://sheets.google.com -> create a new blank Spreadsheet.
 *    Rename it "GreenLife DB" (or anything you like).
 * 2. In the sheet, click Extensions -> Apps Script.
 * 3. Delete any starter code in Code.gs and paste this entire file in.
 * 4. Click the disk icon (Save project).
 * 5. Click Deploy -> New deployment.
 *      - Click the gear icon next to "Select type" -> choose "Web app".
 *      - Description: anything, e.g. "GreenLife API v1".
 *      - Execute as: "Me".
 *      - Who has access: "Anyone" (required so the website can call it).
 * 6. Click "Deploy". Google will ask you to authorize the script — accept it
 *    (click "Advanced" -> "Go to project (unsafe)" if you see a warning
 *    screen, this is normal for your own scripts).
 * 7. Copy the "Web app URL" it gives you — it looks like:
 *      https://script.google.com/macros/s/XXXXXXXXXXXX/exec
 * 8. Paste that URL into js/api.js as `defaultEndpoint`, or into the
 *    website's Settings screen as a custom endpoint.
 * 9. Open the spreadsheet, refresh the page, and use the new "GreenLife"
 *    menu -> "Initialize / Repair Database" to create the sheet tabs
 *    (Users, Habits, HabitLogs, Tasks, ExecutionLogs) right away. This also
 *    happens automatically the first time the app calls the API.
 *
 * RE-DEPLOYING AFTER FUTURE EDITS
 * --------------------------------
 * Any time you change this file, you must click Deploy -> Manage deployments
 * -> pick the active deployment -> Edit (pencil) -> Version: "New version"
 * -> Deploy. Simply saving the file does NOT update the live Web App URL.
 */

// Global Sheet Names
const SHEET_USERS = 'Users';
const SHEET_HABITS = 'Habits';
const SHEET_HABIT_LOGS = 'HabitLogs';
const SHEET_TASKS = 'Tasks';
const SHEET_EXECUTION_LOGS = 'ExecutionLogs';

/**
 * Handle GET requests with automated execution logging and timing
 */
function doGet(e) {
  const startTime = new Date().getTime();
  let action = 'unknown';
  let userId = 'system';

  try {
    const params = e && e.parameter ? e.parameter : {};
    action = params.action || 'getUsers';
    userId = params.userId || 'system';

    // Initialize database sheets if missing
    ensureDatabaseSetup();

    let result = { success: false, data: null };

    switch (action) {
      case 'getUsers':
        result = { success: true, data: getUsersData() };
        break;

      case 'getHabits':
        if (!userId || userId === 'system') throw new Error('userId required');
        result = { success: true, data: getHabitsData(userId) };
        break;

      case 'getHabitLogs':
        if (!userId || userId === 'system') throw new Error('userId required');
        result = { success: true, data: getHabitLogsData(userId) };
        break;

      case 'getTasks':
        if (!userId || userId === 'system') throw new Error('userId required');
        result = { success: true, data: getTasksData(userId) };
        break;

      case 'getProgress':
        if (!userId || userId === 'system') throw new Error('userId required');
        result = { success: true, data: getProgressData(userId, params.date) };
        break;

      case 'getCalendar':
        if (!userId || userId === 'system') throw new Error('userId required');
        result = { success: true, data: getCalendarData(userId, params.month) };
        break;

      case 'getStatistics':
        if (!userId || userId === 'system') throw new Error('userId required');
        result = { success: true, data: getStatisticsData(userId) };
        break;

      case 'getExecutionLogs':
        result = { success: true, data: getExecutionLogsData(params.userId, Number(params.limit || 50)) };
        break;

      case 'setupDatabase':
        ensureDatabaseSetup();
        result = { success: true, message: 'All Google Sheets tables initialized successfully.' };
        break;

      default:
        result = { success: true, message: 'GreenLife API is operational.', version: '1.2' };
        break;
    }

    const elapsedMs = new Date().getTime() - startTime;
    result.executionTimeMs = elapsedMs;

    // Log GET Execution to ExecutionLogs sheet (except self-inspection)
    if (action !== 'getExecutionLogs') {
      appendExecutionLog({
        logId: generateLogId('EXEC-GET'),
        timestamp: new Date().toISOString(),
        userId: userId,
        action: action,
        status: 'SUCCESS',
        executionTimeMs: elapsedMs,
        payloadSummary: JSON.stringify(params).slice(0, 200),
        errorMessage: ''
      });
    }

    return createJsonResponse(result);
  } catch (err) {
    const elapsedMs = new Date().getTime() - startTime;
    const errorStr = err.toString();

    appendExecutionLog({
      logId: generateLogId('EXEC-ERR'),
      timestamp: new Date().toISOString(),
      userId: userId,
      action: action,
      status: 'ERROR',
      executionTimeMs: elapsedMs,
      payloadSummary: '',
      errorMessage: errorStr
    });

    return createJsonResponse({
      success: false,
      error: errorStr,
      executionTimeMs: elapsedMs
    });
  }
}

/**
 * Handle POST requests with automated execution logging and timing
 */
function doPost(e) {
  const startTime = new Date().getTime();
  let action = 'unknown';
  let userId = 'system';

  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    action = payload.action || 'unknown';
    userId = payload.userId || (payload.habit && payload.habit.userId) || (payload.task && payload.task.userId) || 'system';

    ensureDatabaseSetup();

    let result = { success: false };

    switch (action) {
      case 'addHabit':
        result = addHabitRecord(payload.habit);
        break;

      case 'updateHabit':
        result = updateHabitRecord(payload.habit);
        break;

      case 'deleteHabit':
        result = deleteHabitRecord(payload.habitId, payload.userId);
        break;

      case 'toggleHabit':
        result = toggleHabitLogRecord(payload);
        break;

      case 'addTask':
        result = addTaskRecord(payload.task);
        break;

      case 'updateTask':
        result = updateTaskRecord(payload.task);
        break;

      case 'deleteTask':
        result = deleteTaskRecord(payload.taskId, payload.userId);
        break;

      case 'toggleTask':
        result = toggleTaskStatusRecord(payload.taskId, payload.userId, payload.completed);
        break;

      case 'updateUser':
        result = updateUserRecord(payload);
        break;

      case 'logExecution':
        result = logExecutionRecord(payload.log);
        break;

      default:
        throw new Error('Unknown POST action: ' + action);
    }

    const elapsedMs = new Date().getTime() - startTime;
    result.executionTimeMs = elapsedMs;

    if (action !== 'logExecution') {
      appendExecutionLog({
        logId: generateLogId('EXEC-POST'),
        timestamp: new Date().toISOString(),
        userId: userId,
        action: action,
        status: result.success !== false ? 'SUCCESS' : 'ERROR',
        executionTimeMs: elapsedMs,
        payloadSummary: JSON.stringify(payload).slice(0, 200),
        errorMessage: result.error || ''
      });
    }

    return createJsonResponse(result);
  } catch (err) {
    const elapsedMs = new Date().getTime() - startTime;
    const errorStr = err.toString();

    appendExecutionLog({
      logId: generateLogId('EXEC-ERR'),
      timestamp: new Date().toISOString(),
      userId: userId,
      action: action,
      status: 'ERROR',
      executionTimeMs: elapsedMs,
      payloadSummary: '',
      errorMessage: errorStr
    });

    return createJsonResponse({
      success: false,
      error: errorStr,
      executionTimeMs: elapsedMs
    });
  }
}

/**
 * Helper to build JSON Response
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Unique ID Generator
 */
function generateLogId(prefix) {
  return (prefix || 'LOG') + '-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 899 + 100);
}

/**
 * Adds a "GreenLife" menu to the spreadsheet UI so setup can be run manually
 * without needing to call the web app. Run this once by opening the sheet.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('GreenLife')
    .addItem('Initialize / Repair Database', 'ensureDatabaseSetup')
    .addToUi();
}

/**
 * Database Auto-Initialization: Creates necessary sheets, headers, and formats
 */
function ensureDatabaseSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Users Sheet
  let usersSheet = ss.getSheetByName(SHEET_USERS);
  if (!usersSheet) {
    usersSheet = ss.insertSheet(SHEET_USERS);
    usersSheet.appendRow(['userId', 'name', 'role', 'avatar', 'createdAt']);
    usersSheet.appendRow(['hemnath', 'Hemnath', 'Pro Track & Endurance Athlete', '', new Date().toISOString()]);
    usersSheet.appendRow(['velu', 'Velu', 'High-Performance Triathlete', '', new Date().toISOString()]);
    formatHeaderRow(usersSheet, 5);
  }

  // 2. Habits Sheet
  let habitsSheet = ss.getSheetByName(SHEET_HABITS);
  if (!habitsSheet) {
    habitsSheet = ss.insertSheet(SHEET_HABITS);
    habitsSheet.appendRow(['habitId', 'userId', 'name', 'icon', 'color', 'category', 'frequency', 'target', 'reminderTime', 'createdAt', 'active', 'updatedAt']);
    formatHeaderRow(habitsSheet, 12);
    // No sample/demo rows — habits are created only through the app.
  }

  // 3. Habit Logs Sheet
  let logsSheet = ss.getSheetByName(SHEET_HABIT_LOGS);
  if (!logsSheet) {
    logsSheet = ss.insertSheet(SHEET_HABIT_LOGS);
    logsSheet.appendRow(['logId', 'habitId', 'userId', 'date', 'completed', 'completedAt']);
    formatHeaderRow(logsSheet, 6);
  }

  // 4. Tasks Sheet
  let tasksSheet = ss.getSheetByName(SHEET_TASKS);
  if (!tasksSheet) {
    tasksSheet = ss.insertSheet(SHEET_TASKS);
    tasksSheet.appendRow(['taskId', 'userId', 'title', 'description', 'date', 'time', 'priority', 'category', 'completed', 'completedAt', 'createdAt', 'updatedAt']);
    formatHeaderRow(tasksSheet, 12);
    // No sample/demo rows — tasks are created only through the app.
  }

  // 5. Execution Logs Sheet
  let execSheet = ss.getSheetByName(SHEET_EXECUTION_LOGS);
  if (!execSheet) {
    execSheet = ss.insertSheet(SHEET_EXECUTION_LOGS);
    execSheet.appendRow(['logId', 'timestamp', 'userId', 'action', 'status', 'executionTimeMs', 'payloadSummary', 'errorMessage']);
    formatHeaderRow(execSheet, 8);
    execSheet.appendRow([
      generateLogId('EXEC-INIT'),
      new Date().toISOString(),
      'system',
      'ensureDatabaseSetup',
      'SUCCESS',
      15,
      'Database initialized with Users, Habits, HabitLogs, Tasks, and ExecutionLogs',
      ''
    ]);
  }
}

function formatHeaderRow(sheet, colCount) {
  const header = sheet.getRange(1, 1, 1, colCount);
  header.setFontWeight('bold');
  header.setBackground('#10b981');
  header.setFontColor('#ffffff');
  sheet.setFrozenRows(1);
}

// ----------------------------------------------------------------------------
// DATA ACCESS FUNCTIONS
// ----------------------------------------------------------------------------

function getUsersData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  const rows = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    users.push({
      userId: row[0],
      name: row[1],
      role: row[2],
      avatar: row[3],
      createdAt: row[4]
    });
  }
  return users;
}

function getHabitsData(userId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HABITS);
  const rows = sheet.getDataRange().getValues();
  const habits = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[1]).toLowerCase() === String(userId).toLowerCase()) {
      habits.push({
        habitId: r[0],
        userId: r[1],
        name: r[2],
        icon: r[3] || '🎯',
        color: r[4] || '#10b981',
        category: r[5] || 'General',
        frequency: r[6] || 'everyday',
        target: r[7] || '',
        reminderTime: r[8] || '',
        createdAt: r[9],
        active: r[10] === true || r[10] === 'TRUE',
        updatedAt: r[11]
      });
    }
  }
  return habits;
}

function getHabitLogsData(userId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HABIT_LOGS);
  const rows = sheet.getDataRange().getValues();
  const logs = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[2]).toLowerCase() === String(userId).toLowerCase()) {
      let dateVal = r[3];
      if (dateVal instanceof Date) {
        dateVal = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      logs.push({
        logId: r[0],
        habitId: r[1],
        userId: r[2],
        date: String(dateVal),
        completed: r[4] === true || r[4] === 'TRUE',
        completedAt: r[5]
      });
    }
  }
  return logs;
}

function getTasksData(userId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TASKS);
  const rows = sheet.getDataRange().getValues();
  const tasks = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (String(r[1]).toLowerCase() === String(userId).toLowerCase()) {
      let dateVal = r[4];
      if (dateVal instanceof Date) {
        dateVal = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      tasks.push({
        taskId: r[0],
        userId: r[1],
        title: r[2],
        description: r[3],
        date: String(dateVal),
        time: r[5],
        priority: r[6],
        category: r[7],
        completed: r[8] === true || r[8] === 'TRUE',
        completedAt: r[9],
        createdAt: r[10],
        updatedAt: r[11]
      });
    }
  }
  return tasks;
}

function getProgressData(userId, dateStr) {
  const habits = getHabitsData(userId).filter(h => h.active);
  const logs = getHabitLogsData(userId).filter(l => l.date === dateStr && l.completed);
  const total = habits.length;
  const completed = logs.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { date: dateStr, total, completed, percentage };
}

function getCalendarData(userId, monthStr) {
  const logs = getHabitLogsData(userId);
  const tasks = getTasksData(userId);
  return { logs, tasks, month: monthStr };
}

// Compute the current consecutive-day streak for a single habit from its logs
function calculateHabitStreakGs(logs, habitId) {
  const completedDates = logs
    .filter(function (l) { return l.habitId === habitId && l.completed; })
    .map(function (l) { return l.date; })
    .sort()
    .reverse();

  if (completedDates.length === 0) return 0;

  const tz = Session.getScriptTimeZone();
  const today = new Date();
  const todayStr = Utilities.formatDate(today, tz, 'yyyy-MM-dd');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = Utilities.formatDate(yesterday, tz, 'yyyy-MM-dd');

  const hasToday = completedDates.indexOf(todayStr) !== -1;
  const hasYesterday = completedDates.indexOf(yesterdayStr) !== -1;
  if (!hasToday && !hasYesterday) return 0;

  let streak = 0;
  let checkDate = hasToday ? new Date() : yesterday;

  while (true) {
    const checkStr = Utilities.formatDate(checkDate, tz, 'yyyy-MM-dd');
    if (completedDates.indexOf(checkStr) !== -1) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function getStatisticsData(userId) {
  const habits = getHabitsData(userId);
  const logs = getHabitLogsData(userId);
  const tasks = getTasksData(userId);
  const completedTasks = tasks.filter(t => t.completed).length;
  const completedHabitLogs = logs.filter(l => l.completed).length;
  const activeHabits = habits.filter(h => h.active);

  let currentStreak = 0;
  activeHabits.forEach(function (h) {
    const s = calculateHabitStreakGs(logs, h.habitId);
    if (s > currentStreak) currentStreak = s;
  });

  const totalPotentialLogs = activeHabits.length * 14;
  const successRate = totalPotentialLogs > 0
    ? Math.min(100, Math.round((completedHabitLogs / totalPotentialLogs) * 100))
    : 0;

  return {
    totalHabits: habits.length,
    activeHabits: activeHabits.length,
    completedHabitLogs,
    totalTasks: tasks.length,
    completedTasks,
    currentStreak: currentStreak,
    longestStreak: currentStreak,
    successRate: successRate
  };
}

// ----------------------------------------------------------------------------
// EXECUTION LOGGING
// ----------------------------------------------------------------------------

function appendExecutionLog(log) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_EXECUTION_LOGS);
    if (!sheet) return;
    sheet.appendRow([
      log.logId || generateLogId('EXEC'),
      log.timestamp || new Date().toISOString(),
      log.userId || 'system',
      log.action || '',
      log.status || 'SUCCESS',
      log.executionTimeMs || 0,
      log.payloadSummary || '',
      log.errorMessage || ''
    ]);

    // Keep the log sheet manageable (auto-trim after 1000 records)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1000) {
      sheet.deleteRows(2, 200); // delete oldest 200 logs
    }
  } catch (e) {
    Logger.log('Could not append execution log: ' + e);
  }
}

function logExecutionRecord(log) {
  if (!log) return { success: false, error: 'No log data provided' };
  appendExecutionLog(log);
  return { success: true, logged: true };
}

function getExecutionLogsData(userId, limit) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_EXECUTION_LOGS);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const logs = [];
  const max = limit || 50;

  for (let i = rows.length - 1; i >= 1 && logs.length < max; i--) {
    const r = rows[i];
    if (!userId || String(r[2]).toLowerCase() === String(userId).toLowerCase() || r[2] === 'system') {
      logs.push({
        logId: r[0],
        timestamp: r[1],
        userId: r[2],
        action: r[3],
        status: r[4],
        executionTimeMs: r[5],
        payloadSummary: r[6],
        errorMessage: r[7]
      });
    }
  }
  return logs;
}

// ----------------------------------------------------------------------------
// MUTATION OPERATIONS
// ----------------------------------------------------------------------------

function addHabitRecord(habit) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HABITS);
  const now = new Date().toISOString();
  const id = habit.habitId || 'HAB-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') + '-' + Math.floor(Math.random()*899+100);
  sheet.appendRow([
    id,
    habit.userId,
    habit.name,
    habit.icon || '🎯',
    habit.color || '#10b981',
    habit.category || 'General',
    habit.frequency || 'everyday',
    habit.target || '',
    habit.reminderTime || '',
    now,
    true,
    now
  ]);
  return { success: true, habit: { ...habit, habitId: id, createdAt: now, active: true, updatedAt: now } };
}

function updateHabitRecord(habit) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HABITS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === habit.habitId && String(rows[i][1]).toLowerCase() === String(habit.userId).toLowerCase()) {
      const now = new Date().toISOString();
      sheet.getRange(i + 1, 3, 1, 7).setValues([[
        habit.name,
        habit.icon,
        habit.color,
        habit.category || 'General',
        habit.frequency,
        habit.target,
        habit.reminderTime || ''
      ]]);
      sheet.getRange(i + 1, 11).setValue(habit.active !== undefined ? habit.active : true);
      sheet.getRange(i + 1, 12).setValue(now);
      return { success: true, habit };
    }
  }
  return { success: false, error: 'Habit not found' };
}

function deleteHabitRecord(habitId, userId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HABITS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === habitId && String(rows[i][1]).toLowerCase() === String(userId).toLowerCase()) {
      sheet.deleteRow(i + 1);
      
      // Also clean up logs
      const logSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HABIT_LOGS);
      if (logSheet) {
        const logRows = logSheet.getDataRange().getValues();
        for (let j = logRows.length - 1; j >= 1; j--) {
          if (logRows[j][1] === habitId && String(logRows[j][2]).toLowerCase() === String(userId).toLowerCase()) {
            logSheet.deleteRow(j + 1);
          }
        }
      }
      return { success: true, deletedHabitId: habitId };
    }
  }
  return { success: false, error: 'Habit not found' };
}

function toggleHabitLogRecord(payload) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_HABIT_LOGS);
  const rows = sheet.getDataRange().getValues();
  const { habitId, userId, date, completed } = payload;
  const now = new Date().toISOString();

  for (let i = 1; i < rows.length; i++) {
    let rowDate = rows[i][3];
    if (rowDate instanceof Date) {
      rowDate = Utilities.formatDate(rowDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    }
    if (rows[i][1] === habitId && String(rows[i][2]).toLowerCase() === String(userId).toLowerCase() && String(rowDate) === String(date)) {
      if (!completed) {
        sheet.deleteRow(i + 1);
        return { success: true, action: 'removed', habitId, date, completed: false };
      } else {
        sheet.getRange(i + 1, 5).setValue(true);
        sheet.getRange(i + 1, 6).setValue(now);
        return { success: true, action: 'updated', habitId, date, completed: true };
      }
    }
  }

  if (completed) {
    const logId = 'LOG-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') + '-' + Math.floor(Math.random()*899+100);
    sheet.appendRow([logId, habitId, userId, date, true, now]);
    return { success: true, action: 'created', logId, habitId, date, completed: true };
  }
  return { success: true, action: 'noop' };
}

function addTaskRecord(task) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TASKS);
  const now = new Date().toISOString();
  const id = task.taskId || 'TASK-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd') + '-' + Math.floor(Math.random()*899+100);
  sheet.appendRow([
    id,
    task.userId,
    task.title,
    task.description || '',
    task.date,
    task.time || '',
    task.priority || 'medium',
    task.category || 'General',
    false,
    '',
    now,
    now
  ]);
  return { success: true, task: { ...task, taskId: id, completed: false, createdAt: now, updatedAt: now } };
}

function updateTaskRecord(task) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TASKS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === task.taskId && String(rows[i][1]).toLowerCase() === String(task.userId).toLowerCase()) {
      const now = new Date().toISOString();
      sheet.getRange(i + 1, 3, 1, 6).setValues([[
        task.title,
        task.description || '',
        task.date,
        task.time || '',
        task.priority || 'medium',
        task.category || 'General'
      ]]);
      sheet.getRange(i + 1, 12).setValue(now);
      return { success: true, task };
    }
  }
  return { success: false, error: 'Task not found' };
}

function deleteTaskRecord(taskId, userId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TASKS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === taskId && String(rows[i][1]).toLowerCase() === String(userId).toLowerCase()) {
      sheet.deleteRow(i + 1);
      return { success: true, deletedTaskId: taskId };
    }
  }
  return { success: false, error: 'Task not found' };
}

function toggleTaskStatusRecord(taskId, userId, completed) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TASKS);
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === taskId && String(rows[i][1]).toLowerCase() === String(userId).toLowerCase()) {
      const now = new Date().toISOString();
      sheet.getRange(i + 1, 9).setValue(completed);
      sheet.getRange(i + 1, 10).setValue(completed ? now : '');
      sheet.getRange(i + 1, 12).setValue(now);
      return { success: true, taskId, completed };
    }
  }
  return { success: false, error: 'Task not found' };
}

// Update a user's profile fields (currently: avatar, name, role) in the
// Users sheet. userId is required; other fields are optional and only
// overwritten when provided.
function updateUserRecord(payload) {
  const userId = payload.userId;
  if (!userId) return { success: false, error: 'userId is required' };

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS);
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).toLowerCase() === String(userId).toLowerCase()) {
      if (payload.name !== undefined) sheet.getRange(i + 1, 2).setValue(payload.name);
      if (payload.role !== undefined) sheet.getRange(i + 1, 3).setValue(payload.role);
      if (payload.avatar !== undefined) sheet.getRange(i + 1, 4).setValue(payload.avatar);
      return { success: true, userId: userId };
    }
  }
  return { success: false, error: 'User not found' };
}
