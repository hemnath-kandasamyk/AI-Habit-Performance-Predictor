/**
 * ============================================================================
 * GreenLife - TypeScript Backend Data Models & Types (types.ts)
 * Data schemas for Users, Habits, Logs, Tasks, and Execution Logging
 * ============================================================================
 */

export type UserId = 'hemnath' | 'velu' | string;

export type HabitFrequency = 'everyday' | 'weekdays' | 'custom';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskCategory = 'Fitness' | 'Health' | 'Learning' | 'Personal' | 'Work' | 'General';

/**
 * User Profile in Google Sheets 'Users' table
 */
export interface User {
  userId: UserId;
  name: string;
  role: string;
  avatar?: string;
  createdAt: string;
}

/**
 * Habit definition in Google Sheets 'Habits' table
 */
export interface Habit {
  habitId: string;
  userId: UserId;
  name: string;
  icon: string;
  color: string;
  category: TaskCategory;
  frequency: HabitFrequency;
  target: string;
  reminderTime?: string;
  createdAt: string;
  active: boolean;
  updatedAt?: string;
}

/**
 * Daily habit completion log in Google Sheets 'HabitLogs' table
 */
export interface HabitLog {
  logId: string;
  habitId: string;
  userId: UserId;
  date: string; // Format: YYYY-MM-DD
  completed: boolean;
  completedAt?: string; // ISO 8601 string
}

/**
 * Task item in Google Sheets 'Tasks' table
 */
export interface Task {
  taskId: string;
  userId: UserId;
  title: string;
  description: string;
  date: string; // Format: YYYY-MM-DD
  time?: string; // Format: HH:MM
  priority: TaskPriority;
  category: TaskCategory;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Execution Log in Google Sheets 'ExecutionLogs' table
 */
export interface ExecutionLog {
  logId: string;
  timestamp: string; // ISO 8601
  userId: UserId | 'system';
  action: string;
  status: 'SUCCESS' | 'ERROR' | 'PENDING';
  executionTimeMs: number;
  payloadSummary?: string;
  errorMessage?: string;
  clientIp?: string;
}

/**
 * Progress Calculation Summary
 */
export interface ProgressData {
  date: string;
  total: number;
  completed: number;
  percentage: number;
}

/**
 * Calendar Aggregated Data
 */
export interface CalendarData {
  month: string;
  logs: HabitLog[];
  tasks: Task[];
}

/**
 * Overall User Analytics Statistics
 */
export interface StatisticsData {
  totalHabits: number;
  activeHabits: number;
  completedHabitLogs: number;
  totalTasks: number;
  completedTasks: number;
  currentStreak: number;
  longestStreak: number;
  successRate: number;
}

/**
 * Standard API JSON Response envelope
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  executionTimeMs?: number;
  timestamp?: string;
}

/**
 * Supported Backend API Actions
 */
export type ApiAction =
  | 'getUsers'
  | 'getHabits'
  | 'getHabitLogs'
  | 'getTasks'
  | 'getProgress'
  | 'getCalendar'
  | 'getStatistics'
  | 'getExecutionLogs'
  | 'addHabit'
  | 'updateHabit'
  | 'deleteHabit'
  | 'toggleHabit'
  | 'addTask'
  | 'updateTask'
  | 'deleteTask'
  | 'toggleTask'
  | 'logExecution'
  | 'setupDatabase';
