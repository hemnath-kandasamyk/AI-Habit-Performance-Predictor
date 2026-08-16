/**
 * ============================================================================
 * GreenLife - TypeScript Backend Execution Service (executionService.ts)
 * Type-safe execution client for Google Sheets / Google Apps Script Backend
 * Handles queries, mutations, network retries, and automated execution logging
 * ============================================================================
 */

import {
  UserId,
  Habit,
  HabitLog,
  Task,
  ExecutionLog,
  ProgressData,
  CalendarData,
  StatisticsData,
  User,
  ApiResponse,
  ApiAction
} from './types';

export interface BackendServiceConfig {
  endpointUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
  autoLogExecutions?: boolean;
}

export class GoogleSheetsBackendService {
  private endpointUrl: string;
  private timeoutMs: number;
  private maxRetries: number;
  private autoLogExecutions: boolean;

  constructor(config: BackendServiceConfig) {
    this.endpointUrl = config.endpointUrl;
    this.timeoutMs = config.timeoutMs ?? 15000;
    this.maxRetries = config.maxRetries ?? 2;
    this.autoLogExecutions = config.autoLogExecutions ?? true;
  }

  /**
   * Update or switch the active Apps Script endpoint URL
   */
  public setEndpointUrl(url: string): void {
    this.endpointUrl = url;
  }

  public getEndpointUrl(): string {
    return this.endpointUrl;
  }

  /**
   * Internal generic request executor with timing, retries, and logging
   */
  private async executeRequest<T>(
    action: ApiAction,
    method: 'GET' | 'POST',
    params: Record<string, string> = {},
    payload?: Record<string, unknown>,
    userId: UserId | 'system' = 'system'
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      attempt++;
      try {
        let url = this.endpointUrl;
        const queryParams = new URLSearchParams({ action, ...params });
        
        if (method === 'GET') {
          url += (url.includes('?') ? '&' : '?') + queryParams.toString();
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        const fetchOptions: RequestInit = {
          method,
          signal: controller.signal,
          headers: {
            'Content-Type': 'text/plain;charset=utf-8'
          }
        };

        if (method === 'POST') {
          fetchOptions.body = JSON.stringify({
            action,
            userId,
            ...payload
          });
        }

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const text = await response.text();
        let jsonResult: ApiResponse<T>;

        try {
          jsonResult = JSON.parse(text) as ApiResponse<T>;
        } catch {
          throw new Error(`Invalid JSON response: ${text.slice(0, 150)}...`);
        }

        const executionTimeMs = Date.now() - startTime;
        jsonResult.executionTimeMs = executionTimeMs;

        // Auto-log successful execution to Google Sheets if enabled
        if (this.autoLogExecutions && action !== 'logExecution' && action !== 'getExecutionLogs') {
          this.logExecutionAsync({
            logId: `EXEC-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${Math.floor(Math.random() * 899 + 100)}`,
            timestamp: new Date().toISOString(),
            userId,
            action,
            status: jsonResult.success ? 'SUCCESS' : 'ERROR',
            executionTimeMs,
            payloadSummary: payload ? JSON.stringify(payload).slice(0, 200) : JSON.stringify(params),
            errorMessage: jsonResult.error
          });
        }

        return jsonResult;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt <= this.maxRetries) {
          // Wait with exponential backoff before retry (e.g. 500ms, 1000ms)
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
        }
      }
    }

    const totalTimeMs = Date.now() - startTime;
    const errorMsg = lastError ? lastError.message : 'Unknown execution failure';

    // Log failure record
    if (this.autoLogExecutions && action !== 'logExecution') {
      this.logExecutionAsync({
        logId: `EXEC-ERR-${Date.now()}`,
        timestamp: new Date().toISOString(),
        userId,
        action,
        status: 'ERROR',
        executionTimeMs: totalTimeMs,
        errorMessage: errorMsg
      });
    }

    return {
      success: false,
      error: errorMsg,
      executionTimeMs: totalTimeMs
    };
  }

  /**
   * Asynchronously send an execution log without blocking the main caller
   */
  private logExecutionAsync(log: ExecutionLog): void {
    fetch(this.endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'logExecution',
        log
      })
    }).catch((err) => {
      console.warn('[ExecutionService] Background log error:', err);
    });
  }

  // --------------------------------------------------------------------------
  // USER OPERATIONS
  // --------------------------------------------------------------------------

  public async getUsers(): Promise<ApiResponse<User[]>> {
    return this.executeRequest<User[]>('getUsers', 'GET');
  }

  // --------------------------------------------------------------------------
  // HABIT OPERATIONS
  // --------------------------------------------------------------------------

  public async getHabits(userId: UserId): Promise<ApiResponse<Habit[]>> {
    return this.executeRequest<Habit[]>('getHabits', 'GET', { userId }, undefined, userId);
  }

  public async getHabitLogs(userId: UserId): Promise<ApiResponse<HabitLog[]>> {
    return this.executeRequest<HabitLog[]>('getHabitLogs', 'GET', { userId }, undefined, userId);
  }

  public async addHabit(habit: Omit<Habit, 'createdAt' | 'active'> & { active?: boolean }): Promise<ApiResponse<Habit>> {
    return this.executeRequest<Habit>('addHabit', 'POST', {}, { habit }, habit.userId);
  }

  public async updateHabit(habit: Habit): Promise<ApiResponse<Habit>> {
    return this.executeRequest<Habit>('updateHabit', 'POST', {}, { habit }, habit.userId);
  }

  public async deleteHabit(habitId: string, userId: UserId): Promise<ApiResponse<{ deletedHabitId: string }>> {
    return this.executeRequest<{ deletedHabitId: string }>('deleteHabit', 'POST', {}, { habitId, userId }, userId);
  }

  public async toggleHabit(payload: {
    habitId: string;
    userId: UserId;
    date: string;
    completed: boolean;
    logId?: string;
    completedAt?: string;
  }): Promise<ApiResponse<{ action: string; habitId: string; completed: boolean }>> {
    return this.executeRequest('toggleHabit', 'POST', {}, payload, payload.userId);
  }

  // --------------------------------------------------------------------------
  // TASK OPERATIONS
  // --------------------------------------------------------------------------

  public async getTasks(userId: UserId): Promise<ApiResponse<Task[]>> {
    return this.executeRequest<Task[]>('getTasks', 'GET', { userId }, undefined, userId);
  }

  public async addTask(task: Omit<Task, 'createdAt' | 'completed'> & { completed?: boolean }): Promise<ApiResponse<Task>> {
    return this.executeRequest<Task>('addTask', 'POST', {}, { task }, task.userId);
  }

  public async updateTask(task: Task): Promise<ApiResponse<Task>> {
    return this.executeRequest<Task>('updateTask', 'POST', {}, { task }, task.userId);
  }

  public async deleteTask(taskId: string, userId: UserId): Promise<ApiResponse<{ deletedTaskId: string }>> {
    return this.executeRequest<{ deletedTaskId: string }>('deleteTask', 'POST', {}, { taskId, userId }, userId);
  }

  public async toggleTask(taskId: string, userId: UserId, completed: boolean): Promise<ApiResponse<{ taskId: string; completed: boolean }>> {
    return this.executeRequest('toggleTask', 'POST', {}, { taskId, userId, completed }, userId);
  }

  // --------------------------------------------------------------------------
  // DASHBOARD, PROGRESS & CALENDAR
  // --------------------------------------------------------------------------

  public async getProgress(userId: UserId, date: string): Promise<ApiResponse<ProgressData>> {
    return this.executeRequest<ProgressData>('getProgress', 'GET', { userId, date }, undefined, userId);
  }

  public async getCalendar(userId: UserId, month: string): Promise<ApiResponse<CalendarData>> {
    return this.executeRequest<CalendarData>('getCalendar', 'GET', { userId, month }, undefined, userId);
  }

  public async getStatistics(userId: UserId): Promise<ApiResponse<StatisticsData>> {
    return this.executeRequest<StatisticsData>('getStatistics', 'GET', { userId }, undefined, userId);
  }

  // --------------------------------------------------------------------------
  // AUDIT & EXECUTION LOGS
  // --------------------------------------------------------------------------

  public async getExecutionLogs(userId?: UserId, limit: number = 50): Promise<ApiResponse<ExecutionLog[]>> {
    const params: Record<string, string> = { limit: String(limit) };
    if (userId) params.userId = userId;
    return this.executeRequest<ExecutionLog[]>('getExecutionLogs', 'GET', params, undefined, userId || 'system');
  }

  public async logCustomExecution(log: ExecutionLog): Promise<ApiResponse<{ logged: boolean }>> {
    return this.executeRequest<{ logged: boolean }>('logExecution', 'POST', {}, { log }, log.userId);
  }
}
