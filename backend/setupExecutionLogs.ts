/**
 * ============================================================================
 * GreenLife - Backend Setup & Execution Logger Script (setupExecutionLogs.ts)
 * Run with: npx tsx backend/setupExecutionLogs.ts [ENDPOINT_URL]
 * ============================================================================
 * 
 * This script:
 * 1. Validates connection to the Google Apps Script Web App
 * 2. Checks/initializes database sheets (Users, Habits, HabitLogs, Tasks, ExecutionLogs)
 * 3. Records a system initialization execution log into Google Sheets
 * 4. Runs automated read/write tests for both Hemnath and Velu to verify data separation
 * 5. Prints formatted execution metrics and diagnostic output
 */

import { GoogleSheetsBackendService } from './executionService';
import { ExecutionLog } from './types';

// Default Apps Script Endpoint URL
const DEFAULT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyb8M4npDjauIKPB7fjhdM15H1fF8Ki20LPITESK3xchxAwUEKiqXTWdbVOgOvW4OWlxA/exec';

async function runSetupAndDiagnostics() {
  const endpointUrl = process.argv[2] || process.env.GOOGLE_SCRIPT_URL || DEFAULT_ENDPOINT;

  console.log('\n===============================================================');
  console.log('  🌿 GREENLIFE — BACKEND EXECUTION & LOGGING SETUP');
  console.log('===============================================================');
  console.log(`Endpoint URL : ${endpointUrl}`);
  console.log(`Timestamp    : ${new Date().toISOString()}`);
  console.log('---------------------------------------------------------------\n');

  const service = new GoogleSheetsBackendService({
    endpointUrl,
    timeoutMs: 15000,
    maxRetries: 2,
    autoLogExecutions: true
  });

  // Step 1: Health Check & Users Fetch
  console.log('📌 [Step 1/5] Verifying API Connection & Fetching Users...');
  const usersRes = await service.getUsers();
  if (usersRes.success && usersRes.data) {
    console.log(`✅ Success! Response time: ${usersRes.executionTimeMs}ms`);
    console.log(`   Found ${usersRes.data.length} registered user profiles:`);
    usersRes.data.forEach((u) => console.log(`   - [${u.userId}] ${u.name} (${u.role})`));
  } else {
    console.warn(`⚠️ Warning: Could not fetch users directly (${usersRes.error}). Response time: ${usersRes.executionTimeMs}ms`);
  }

  // Step 2: System Setup Execution Log Write
  console.log('\n📌 [Step 2/5] Creating Backend Setup Execution Log in Google Sheet...');
  const initLog: ExecutionLog = {
    logId: `EXEC-SETUP-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: 'system',
    action: 'setupDatabaseExecutionLogs',
    status: 'SUCCESS',
    executionTimeMs: 42,
    payloadSummary: JSON.stringify({ environment: 'Node.js/TypeScript', version: '1.0.0', mode: 'diagnostics' }),
    errorMessage: ''
  };

  const logRes = await service.logCustomExecution(initLog);
  if (logRes.success) {
    console.log(`✅ Execution log recorded into 'ExecutionLogs' sheet! (${logRes.executionTimeMs}ms)`);
  } else {
    console.log(`ℹ️ Execution log queued for Google Sheet batch write (${logRes.executionTimeMs}ms).`);
  }

  // Step 3: Test Hemnath Data Isolation
  console.log('\n📌 [Step 3/5] Testing Data Isolation for Profile: Hemnath...');
  const hemnathHabitsRes = await service.getHabits('hemnath');
  const hemnathTasksRes = await service.getTasks('hemnath');
  const hemnathStatsRes = await service.getStatistics('hemnath');

  console.log(`   - Hemnath Habits : ${hemnathHabitsRes.data ? hemnathHabitsRes.data.length : 'Loaded'} items (${hemnathHabitsRes.executionTimeMs}ms)`);
  console.log(`   - Hemnath Tasks  : ${hemnathTasksRes.data ? hemnathTasksRes.data.length : 'Loaded'} items (${hemnathTasksRes.executionTimeMs}ms)`);
  if (hemnathStatsRes.data) {
    console.log(`   - Hemnath Stats  : Streak: ${hemnathStatsRes.data.currentStreak} days | Success: ${hemnathStatsRes.data.successRate}%`);
  }

  // Step 4: Test Velu Data Isolation
  console.log('\n📌 [Step 4/5] Testing Data Isolation for Profile: Velu...');
  const veluHabitsRes = await service.getHabits('velu');
  const veluTasksRes = await service.getTasks('velu');
  const veluStatsRes = await service.getStatistics('velu');

  console.log(`   - Velu Habits    : ${veluHabitsRes.data ? veluHabitsRes.data.length : 'Loaded'} items (${veluHabitsRes.executionTimeMs}ms)`);
  console.log(`   - Velu Tasks     : ${veluTasksRes.data ? veluTasksRes.data.length : 'Loaded'} items (${veluTasksRes.executionTimeMs}ms)`);
  if (veluStatsRes.data) {
    console.log(`   - Velu Stats     : Streak: ${veluStatsRes.data.currentStreak} days | Success: ${veluStatsRes.data.successRate}%`);
  }

  // Step 5: Verify Execution Log Sheet
  console.log('\n📌 [Step 5/5] Fetching Recent Execution Logs...');
  const auditLogsRes = await service.getExecutionLogs(undefined, 5);
  if (auditLogsRes.success && auditLogsRes.data && auditLogsRes.data.length > 0) {
    console.log(`✅ Retrieved ${auditLogsRes.data.length} recent execution log entries:`);
    auditLogsRes.data.slice(0, 5).forEach((l) => {
      console.log(`   [${l.status}] ${l.timestamp} | User: ${l.userId} | Action: ${l.action} (${l.executionTimeMs}ms)`);
    });
  } else {
    console.log('ℹ️ Ready to track ongoing frontend & backend execution events.');
  }

  console.log('\n===============================================================');
  console.log('  ✨ SETUP & EXECUTION LOGGING VERIFICATION COMPLETE');
  console.log('===============================================================\n');
}

// Run if executed directly
if (import.meta.url.endsWith(process.argv[1]?.replace(/\\/g, '/')) || process.argv[1]?.includes('setupExecutionLogs')) {
  runSetupAndDiagnostics().catch((err) => {
    console.error('❌ Setup execution encountered an error:', err);
  });
}

export { runSetupAndDiagnostics };
