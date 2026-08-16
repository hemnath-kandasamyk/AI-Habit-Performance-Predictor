# 🌿 GreenLife — Backend Execution & Google Sheets Setup

This folder contains the complete backend infrastructure for **GreenLife**:
1. **`types.ts`** — TypeScript data models for Users, Habits, Logs, Tasks, and Execution Logging.
2. **`executionService.ts`** — TypeScript service module for backend execution against Google Apps Script / Google Sheets with automatic execution timing and error logging.
3. **`setupExecutionLogs.ts`** — Standalone Node.js/TypeScript diagnostic and setup runner.
4. **`Code.gs`** — Google Apps Script backend engine with auto-provisioning, data separation, and real-time execution logging into the `ExecutionLogs` sheet.

---

## 📊 Google Sheets Database Structure

The backend automatically creates and formats 5 sheets in your Google Spreadsheet:

### 1. `Users`
| Column | Type | Description |
| :--- | :--- | :--- |
| `userId` | String | Unique user ID (`hemnath` / `velu`) |
| `name` | String | User display name |
| `role` | String | User subtitle / bio |
| `avatar` | String | Avatar image URL |
| `createdAt` | ISO String | Registration timestamp |

### 2. `Habits`
| Column | Type | Description |
| :--- | :--- | :--- |
| `habitId` | String | Unique ID (`HAB-YYYYMMDD-XXX`) |
| `userId` | String | Foreign key (`hemnath` / `velu`) |
| `name` | String | Habit title |
| `icon` | String | Emoji icon |
| `color` | String | Accent hex color |
| `category` | String | Fitness, Health, Learning, etc. |
| `frequency` | String | `everyday`, `weekdays`, `custom` |
| `target` | String | Target quantity / duration |
| `reminderTime` | String | `HH:MM` format |
| `createdAt` | ISO String | Creation timestamp |
| `active` | Boolean | `TRUE` / `FALSE` |
| `updatedAt` | ISO String | Last modified timestamp |

### 3. `HabitLogs`
| Column | Type | Description |
| :--- | :--- | :--- |
| `logId` | String | Unique log ID (`LOG-YYYYMMDD-XXX`) |
| `habitId` | String | Foreign key referencing Habits |
| `userId` | String | Foreign key (`hemnath` / `velu`) |
| `date` | String | `YYYY-MM-DD` completion date |
| `completed` | Boolean | `TRUE` / `FALSE` |
| `completedAt` | ISO String | Completion timestamp |

### 4. `Tasks`
| Column | Type | Description |
| :--- | :--- | :--- |
| `taskId` | String | Unique task ID (`TASK-YYYYMMDD-XXX`) |
| `userId` | String | Foreign key (`hemnath` / `velu`) |
| `title` | String | Task title |
| `description` | String | Optional notes |
| `date` | String | `YYYY-MM-DD` |
| `time` | String | `HH:MM` |
| `priority` | String | `high`, `medium`, `low` |
| `category` | String | Task category |
| `completed` | Boolean | `TRUE` / `FALSE` |
| `completedAt` | ISO String | Completion timestamp |
| `createdAt` | ISO String | Creation timestamp |
| `updatedAt` | ISO String | Last modified timestamp |

### 5. `ExecutionLogs` (Audit & Telemetry)
| Column | Type | Description |
| :--- | :--- | :--- |
| `logId` | String | Unique execution ID (`EXEC-YYYYMMDD-HHMMSS-XXX`) |
| `timestamp` | ISO String | Execution start timestamp |
| `userId` | String | Initiator (`hemnath` / `velu` / `system`) |
| `action` | String | Action invoked (`getHabits`, `addTask`, etc.) |
| `status` | String | `SUCCESS` / `ERROR` |
| `executionTimeMs` | Number | Execution duration in milliseconds |
| `payloadSummary` | String | Sanitized payload / query parameters |
| `errorMessage` | String | Error details if status is `ERROR` |

---

## 🚀 TypeScript Backend Execution

You can run backend queries, mutations, and verification tests directly using TypeScript:

```bash
# Run the setup and execution logger test runner
npx tsx backend/setupExecutionLogs.ts [OPTIONAL_ENDPOINT_URL]
```

### Example Usage in TypeScript / Node:

```typescript
import { GoogleSheetsBackendService } from './backend/executionService';

const service = new GoogleSheetsBackendService({
  endpointUrl: 'https://script.google.com/macros/s/.../exec',
  autoLogExecutions: true
});

// Fetch Hemnath's Habits
const habits = await service.getHabits('hemnath');
console.log(`Loaded ${habits.data?.length} habits in ${habits.executionTimeMs}ms`);

// Add a Task for Velu
const newTask = await service.addTask({
  taskId: `TASK-${Date.now()}`,
  userId: 'velu',
  title: 'Olympic Distance Simulation',
  description: '1.5km swim, 40km bike, 10km run',
  date: '2026-08-20',
  time: '06:00',
  priority: 'high',
  category: 'Fitness'
});
console.log('Task Created:', newTask.data?.taskId);
```

---

## 🛠️ Google Apps Script Deployment

1. Create a Google Sheet named **"GreenLife DB"**.
2. Click **Extensions** → **Apps Script**.
3. Copy and paste the content of **`backend/Code.gs`** into the editor.
4. Click **Deploy** → **New deployment**.
5. Select **Web app**, set **Execute as**: *Me*, and **Who has access**: *Anyone*.
6. Copy the Web App URL and paste it into GreenLife Settings (Profile → Google Sheets Web API).
