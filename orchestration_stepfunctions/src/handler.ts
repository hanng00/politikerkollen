/**
 * Admin UI Lambda — HTML + JSON API for Step Functions orchestration.
 *
 * Single Lambda serving UI (GET) and API (POST) via Function URL.
 * Uses Alpine.js for reactivity.
 */

import {
  SFNClient,
  StartExecutionCommand,
  ListExecutionsCommand,
  DescribeExecutionCommand,
  StopExecutionCommand,
  GetExecutionHistoryCommand,
} from '@aws-sdk/client-sfn';
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

const sfn = new SFNClient({});
const logs = new CloudWatchLogsClient({});

const INGESTION_STATE_MACHINE_ARN = process.env.INGESTION_STATE_MACHINE_ARN!;
const COGNITION_STATE_MACHINE_ARN = process.env.COGNITION_STATE_MACHINE_ARN!;
const DBT_STATE_MACHINE_ARN = process.env.DBT_STATE_MACHINE_ARN!;
const FULL_PIPELINE_STATE_MACHINE_ARN = process.env.FULL_PIPELINE_STATE_MACHINE_ARN!;

const INGESTION_LOG_GROUP = process.env.INGESTION_LOG_GROUP!;
const COGNITION_LOG_GROUP = process.env.COGNITION_LOG_GROUP!;
const DBT_LOG_GROUP = process.env.DBT_LOG_GROUP!;

interface LambdaEvent {
  requestContext: {
    http: {
      method: string;
      path: string;
    };
  };
  headers: Record<string, string>;
  body?: string;
  queryStringParameters?: Record<string, string>;
}

function json(data: unknown, statusCode = 200) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

function html(content: string) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html' },
    body: content,
  };
}

type ExecutionListKey = 'ingestion' | 'cognition' | 'dbt' | 'fullPipeline';

const EXECUTION_PAGE_SIZE = 15;

async function listExecutionsPage(
  stateMachineArn: string,
  maxResults: number,
  nextToken?: string,
) {
  const response = await sfn.send(
    new ListExecutionsCommand({
      stateMachineArn,
      maxResults,
      nextToken,
    }),
  );
  return {
    executions: response.executions ?? [],
    nextToken: response.nextToken,
  };
}

function sanitizeNextTokens(
  raw?: Partial<Record<ExecutionListKey, string | null | undefined>>,
): Partial<Record<ExecutionListKey, string>> {
  if (!raw) return {};
  const keys: ExecutionListKey[] = ['ingestion', 'cognition', 'dbt', 'fullPipeline'];
  const out: Partial<Record<ExecutionListKey, string>> = {};
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === 'string' && v.length > 0) {
      out[k] = v;
    }
  }
  return out;
}

async function listAllExecutionPages(body: {
  maxResults?: number;
  nextTokens?: Partial<Record<ExecutionListKey, string | null | undefined>>;
}) {
  const max = Math.min(body.maxResults ?? EXECUTION_PAGE_SIZE, 50);
  const t = sanitizeNextTokens(body.nextTokens);
  const [ingestion, cognition, dbt, fullPipeline] = await Promise.all([
    listExecutionsPage(INGESTION_STATE_MACHINE_ARN, max, t.ingestion),
    listExecutionsPage(COGNITION_STATE_MACHINE_ARN, max, t.cognition),
    listExecutionsPage(DBT_STATE_MACHINE_ARN, max, t.dbt),
    listExecutionsPage(FULL_PIPELINE_STATE_MACHINE_ARN, max, t.fullPipeline),
  ]);
  return {
    ingestion: ingestion.executions,
    cognition: cognition.executions,
    dbt: dbt.executions,
    fullPipeline: fullPipeline.executions,
    nextTokens: {
      ingestion: ingestion.nextToken,
      cognition: cognition.nextToken,
      dbt: dbt.nextToken,
      fullPipeline: fullPipeline.nextToken,
    },
  };
}

async function startExecution(stateMachineArn: string, input: Record<string, unknown>) {
  const response = await sfn.send(
    new StartExecutionCommand({
      stateMachineArn,
      input: JSON.stringify(input),
      name: `admin-${Date.now()}`,
    }),
  );
  return response;
}

async function getExecution(executionArn: string) {
  const response = await sfn.send(
    new DescribeExecutionCommand({
      executionArn,
    }),
  );
  return response;
}

async function stopExecution(executionArn: string) {
  await sfn.send(
    new StopExecutionCommand({
      executionArn,
      cause: 'Stopped via admin UI',
    }),
  );
}

async function getExecutionHistoryPage(
  executionArn: string,
  maxResults = 40,
  nextToken?: string,
) {
  const response = await sfn.send(
    new GetExecutionHistoryCommand({
      executionArn,
      maxResults,
      nextToken,
      reverseOrder: true,
    }),
  );
  return {
    events: response.events ?? [],
    nextToken: response.nextToken,
  };
}

async function getLogsPage(params: {
  logGroupName: string;
  startTime?: number;
  nextToken?: string;
  limit?: number;
}) {
  const response = await logs.send(
    new FilterLogEventsCommand({
      logGroupName: params.logGroupName,
      startTime: params.startTime,
      nextToken: params.nextToken,
      limit: params.limit ?? 100,
    }),
  );
  return {
    events: response.events ?? [],
    nextToken: response.nextToken,
  };
}

const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Politikerkollen Admin</title>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    h1 { color: #1a1a1a; margin-bottom: 0.5rem; }
    h2 { color: #333; margin-top: 2rem; border-bottom: 2px solid #ddd; padding-bottom: 0.5rem; }
    .subtitle { color: #666; margin-bottom: 2rem; }
    .card {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; }
    label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #333; }
    select, input[type="text"], input[type="date"], input[type="number"] {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
      margin-bottom: 1rem;
    }
    button {
      background: #2563eb;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      font-size: 1rem;
      cursor: pointer;
      margin-right: 0.5rem;
      margin-bottom: 0.5rem;
    }
    button:hover { background: #1d4ed8; }
    button:disabled { background: #9ca3af; cursor: not-allowed; }
    button.secondary { background: #6b7280; }
    button.danger { background: #dc2626; }
    button.danger:hover { background: #b91c1c; }
    .status { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; font-weight: 500; }
    .status.running { background: #fef3c7; color: #92400e; }
    .status.succeeded { background: #d1fae5; color: #065f46; }
    .status.failed { background: #fee2e2; color: #991b1b; }
    .status.aborted { background: #e5e7eb; color: #374151; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.6rem; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    th { background: #f9fafb; font-weight: 500; }
    .mono { font-family: monospace; font-size: 0.8rem; word-break: break-all; }
    .logs {
      background: #1a1a1a;
      color: #e5e5e5;
      padding: 1rem;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.75rem;
      max-height: 320px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      padding: 1rem 1.5rem;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      z-index: 1000;
    }
    .toast.success { background: #059669; }
    .toast.error { background: #dc2626; }
    .tabs { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .tab {
      padding: 0.5rem 1rem;
      background: #e5e7eb;
      border: none;
      border-radius: 4px 4px 0 0;
      cursor: pointer;
    }
    .tab.active { background: white; }
    .hint { font-size: 0.85rem; color: #64748b; margin-top: -0.5rem; margin-bottom: 1rem; }
    .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; margin-bottom: 1rem; }
    .badge { font-size: 0.7rem; background: #e0e7ff; color: #3730a3; padding: 0.15rem 0.4rem; border-radius: 4px; }
  </style>
</head>
<body x-data="admin()" x-init="init()">
  <h1>Politikerkollen Admin</h1>
  <p class="subtitle">Step Functions — ingestion, dbt, cognition, full pipeline</p>

  <template x-if="toast.show">
    <div class="toast" :class="toast.type" x-text="toast.message" x-transition></div>
  </template>

  <div class="tabs">
    <button type="button" class="tab" :class="{ active: tab === 'ingestion' }" @click="tab = 'ingestion'">Ingestion</button>
    <button type="button" class="tab" :class="{ active: tab === 'dbt' }" @click="tab = 'dbt'">dbt</button>
    <button type="button" class="tab" :class="{ active: tab === 'cognition' }" @click="tab = 'cognition'">Cognition</button>
    <button type="button" class="tab" :class="{ active: tab === 'full' }" @click="tab = 'full'">Full pipeline</button>
    <button type="button" class="tab" :class="{ active: tab === 'executions' }" @click="tab = 'executions'; loadExecutions(false)">Executions</button>
  </div>

  <div x-show="tab === 'ingestion'" class="card">
    <h2 style="margin-top: 0">Ingestion</h2>
    <div class="grid">
      <div>
        <label>Mode</label>
        <select x-model="ingestion.mode">
          <option value="incremental">Incremental (all resources in parallel)</option>
          <option value="single">Single resource</option>
          <option value="backfill">Backfill (date range)</option>
        </select>
      </div>
      <div x-show="ingestion.mode !== 'incremental'">
        <label>Resource</label>
        <select x-model="ingestion.resource">
          <option value="anforande">anforande</option>
          <option value="voteringlista">voteringlista</option>
          <option value="dokumentlista">dokumentlista</option>
          <option value="dokumentstatus">dokumentstatus</option>
          <option value="personlista">personlista</option>
          <option value="valmanifest">valmanifest</option>
          <option value="tidoavtalet">tidoavtalet</option>
        </select>
      </div>
    </div>
    <div class="grid" x-show="ingestion.mode === 'backfill'">
      <div><label>Start date</label><input type="date" x-model="ingestion.startDate"></div>
      <div><label>End date</label><input type="date" x-model="ingestion.endDate"></div>
    </div>
    <button type="button" @click="startIngestion()" :disabled="loading">Start ingestion</button>
  </div>

  <div x-show="tab === 'dbt'" class="card">
    <h2 style="margin-top: 0">dbt</h2>
    <p class="hint">Leave selector empty for a full <code>dbt build</code>. Optional <code>--select</code> (e.g. <code>stg_*</code>).</p>
    <div class="grid">
      <div>
        <label>Selector (optional)</label>
        <input type="text" x-model="dbt.select" placeholder="e.g. stg_valmanifest+">
      </div>
      <div>
        <label><input type="checkbox" x-model="dbt.fullRefresh"> Full refresh</label>
      </div>
    </div>
    <button type="button" @click="startDbt()" :disabled="loading">Run dbt</button>
  </div>

  <div x-show="tab === 'cognition'" class="card">
    <h2 style="margin-top: 0">Cognition</h2>
    <p class="hint">Realtime / limit are sent in input for future ASL support; current state machine uses year only.</p>
    <div class="grid">
      <div>
        <label>Task</label>
        <select x-model="cognition.task">
          <option value="full-pipeline">Full pipeline</option>
          <option value="extract-promises">Extract promises</option>
          <option value="embed-promises">Embed promises</option>
          <option value="build-source-texts">Build source texts</option>
          <option value="embed-sources">Embed sources</option>
          <option value="match-promises">Match promises</option>
        </select>
      </div>
      <div>
        <label>Year (election / riksmöte)</label>
        <select x-model="cognition.year">
          <option value="2022">2022</option>
          <option value="2018">2018</option>
          <option value="2014">2014</option>
          <option value="2010">2010</option>
        </select>
      </div>
    </div>
    <div class="grid">
      <div><label><input type="checkbox" x-model="cognition.realtime"> Realtime (costlier)</label></div>
      <div><label>Limit (optional)</label><input type="number" x-model="cognition.limit" placeholder="All"></div>
    </div>
    <button type="button" @click="startCognition()" :disabled="loading">Start cognition</button>
  </div>

  <div x-show="tab === 'full'" class="card">
    <h2 style="margin-top: 0">Full pipeline</h2>
    <p class="hint">Runs ingestion → dbt → cognition in one execution.</p>
    <div class="grid">
      <div>
        <label>Ingestion mode</label>
        <select x-model="full.ingestionMode">
          <option value="incremental">Incremental</option>
          <option value="single">Single resource</option>
          <option value="backfill">Backfill</option>
        </select>
      </div>
      <div x-show="full.ingestionMode !== 'incremental'">
        <label>Resource</label>
        <select x-model="full.resource">
          <option value="anforande">anforande</option>
          <option value="voteringlista">voteringlista</option>
          <option value="dokumentlista">dokumentlista</option>
          <option value="dokumentstatus">dokumentstatus</option>
          <option value="personlista">personlista</option>
          <option value="valmanifest">valmanifest</option>
          <option value="tidoavtalet">tidoavtalet</option>
        </select>
      </div>
    </div>
    <div class="grid" x-show="full.ingestionMode === 'backfill'">
      <div><label>Start date</label><input type="date" x-model="full.startDate"></div>
      <div><label>End date</label><input type="date" x-model="full.endDate"></div>
    </div>
    <div class="grid">
      <div>
        <label>dbt selector (optional)</label>
        <input type="text" x-model="full.dbtSelect" placeholder="Empty = full build">
      </div>
      <div><label><input type="checkbox" x-model="full.dbtFullRefresh"> dbt full refresh</label></div>
    </div>
    <div class="grid">
      <div>
        <label>Cognition task</label>
        <select x-model="full.cognitionTask">
          <option value="full-pipeline">Full pipeline</option>
          <option value="extract-promises">Extract promises only</option>
          <option value="match-promises">Match promises only</option>
        </select>
      </div>
      <div>
        <label>Year</label>
        <select x-model="full.year">
          <option value="2022">2022</option>
          <option value="2018">2018</option>
          <option value="2014">2014</option>
          <option value="2010">2010</option>
        </select>
      </div>
    </div>
    <div class="grid">
      <div><label><input type="checkbox" x-model="full.realtime"> Cognition realtime</label></div>
    </div>
    <button type="button" @click="startFullPipeline()" :disabled="loading">Start full pipeline</button>
  </div>

  <div x-show="tab === 'executions'" class="card">
    <h2 style="margin-top: 0">Executions</h2>
    <div class="toolbar">
      <button type="button" class="secondary" @click="loadExecutions(false)" :disabled="loading">Refresh</button>
      <label><input type="checkbox" x-model="autoRefresh"> Auto-refresh (15s)</label>
      <label><input type="checkbox" x-model="logStreamEnabled"> Stream logs when RUNNING</label>
    </div>

    <template x-for="block in executionBlocks" :key="block.key">
      <div style="margin-bottom: 2rem;">
        <h3><span class="badge" x-text="block.key"></span> <span x-text="block.title"></span></h3>
        <table>
          <thead>
            <tr><th>Name</th><th>Status</th><th>Started</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <template x-for="exec in block.rows" :key="exec.executionArn">
              <tr>
                <td class="mono" x-text="exec.name"></td>
                <td><span class="status" :class="(exec.status || '').toLowerCase()" x-text="exec.status"></span></td>
                <td x-text="exec.startDate ? new Date(exec.startDate).toLocaleString() : ''"></td>
                <td>
                  <button type="button" class="secondary" @click="openExecution(exec)">Details</button>
                  <button type="button" class="secondary" @click="openLogs(block.logGroup)">Logs</button>
                  <button type="button" class="danger" x-show="exec.status === 'RUNNING'" @click="stopExec(exec.executionArn)">Stop</button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <button type="button" class="secondary" x-show="block.nextToken" @click="loadMore(block.key)" :disabled="loading">Load more</button>
      </div>
    </template>
  </div>

  <div x-show="selectedExecution" class="card" style="margin-top: 1rem;">
    <h2 style="margin-top: 0">Execution details</h2>
    <button type="button" class="secondary" @click="closeExecution()">Close</button>
    <template x-if="selectedExecution">
      <div>
        <p><strong>ARN</strong> <span class="mono" x-text="selectedExecution.executionArn"></span></p>
        <p><strong>Status</strong> <span class="status" :class="(selectedExecution.status || '').toLowerCase()" x-text="selectedExecution.status"></span></p>
        <p><strong>Input</strong></p>
        <pre class="logs" x-text="formatJson(selectedExecution.input)"></pre>
        <template x-if="selectedExecution.output">
          <div>
            <p><strong>Output</strong></p>
            <pre class="logs" x-text="formatJson(selectedExecution.output)"></pre>
          </div>
        </template>
        <template x-if="selectedExecution.error">
          <div>
            <p><strong>Error</strong></p>
            <pre class="logs" style="background: #450a0a;" x-text="(selectedExecution.error || '') + ': ' + (selectedExecution.cause || '')"></pre>
          </div>
        </template>
        <h3>History (recent first)</h3>
        <button type="button" class="secondary" @click="loadHistory(true)" :disabled="loading">Refresh history</button>
        <button type="button" class="secondary" x-show="historyNextToken" @click="loadHistory(false)" :disabled="loading">Older events</button>
        <pre class="logs" style="max-height: 240px;" x-text="historyText"></pre>

        <h3>CloudWatch logs</h3>
        <div class="grid">
          <div>
            <label>Log group</label>
            <select x-model="logGroupChoice">
              <option value="ingestion">Ingestion</option>
              <option value="cognition">Cognition</option>
              <option value="dbt">dbt</option>
            </select>
          </div>
        </div>
        <button type="button" class="secondary" @click="fetchLogs(true)" :disabled="loading">Load logs</button>
        <button type="button" class="secondary" x-show="logsNextToken" @click="fetchLogs(false)" :disabled="loading">Next page</button>
        <pre class="logs" x-text="logsText"></pre>
      </div>
    </template>
  </div>

  <script>
    function admin() {
      return {
        tab: 'ingestion',
        loading: false,
        toast: { show: false, message: '', type: 'success' },
        autoRefresh: false,
        autoTimer: null,
        logStreamTimer: null,
        logStreamEnabled: false,
        ingestion: { mode: 'incremental', resource: 'anforande', startDate: '', endDate: '' },
        dbt: { select: '', fullRefresh: false },
        cognition: { task: 'full-pipeline', year: '2022', realtime: false, limit: null },
        full: {
          ingestionMode: 'incremental',
          resource: 'anforande',
          startDate: '',
          endDate: '',
          dbtSelect: '',
          dbtFullRefresh: false,
          cognitionTask: 'full-pipeline',
          year: '2022',
          realtime: false,
        },
        executions: { ingestion: [], cognition: [], dbt: [], fullPipeline: [] },
        nextTokens: { ingestion: null, cognition: null, dbt: null, fullPipeline: null },
        selectedExecution: null,
        historyText: '',
        historyNextToken: null,
        logsText: '',
        logsNextToken: null,
        logGroupChoice: 'ingestion',

        get executionBlocks() {
          return [
            { key: 'ingestion', title: 'Ingestion', rows: this.executions.ingestion, nextToken: this.nextTokens.ingestion, logGroup: 'ingestion' },
            { key: 'dbt', title: 'dbt', rows: this.executions.dbt, nextToken: this.nextTokens.dbt, logGroup: 'dbt' },
            { key: 'cognition', title: 'Cognition', rows: this.executions.cognition, nextToken: this.nextTokens.cognition, logGroup: 'cognition' },
            { key: 'fullPipeline', title: 'Full pipeline', rows: this.executions.fullPipeline, nextToken: this.nextTokens.fullPipeline, logGroup: 'ingestion' },
          ];
        },

        init() {
          this.$watch('autoRefresh', (on) => {
            if (this.autoTimer) clearInterval(this.autoTimer);
            if (on && this.tab === 'executions') {
              this.autoTimer = setInterval(() => this.loadExecutions(false), 15000);
            }
          });
          this.$watch('tab', (t) => {
            if (t === 'executions' && this.autoRefresh) {
              if (this.autoTimer) clearInterval(this.autoTimer);
              this.autoTimer = setInterval(() => this.loadExecutions(false), 15000);
            }
            if (t !== 'executions' && this.autoTimer) {
              clearInterval(this.autoTimer);
              this.autoTimer = null;
            }
          });
          this.$watch('logStreamEnabled', (on) => {
            if (this.logStreamTimer) clearInterval(this.logStreamTimer);
            if (on) {
              this.logStreamTimer = setInterval(() => this.maybeStreamLogs(), 8000);
            }
          });
        },

        showToast(message, type = 'success') {
          this.toast = { show: true, message, type };
          setTimeout(() => { this.toast.show = false; }, 3200);
        },

        formatJson(s) {
          try { return JSON.stringify(JSON.parse(s || '{}'), null, 2); } catch { return s || ''; }
        },

        logGroupName(key) {
          const m = {
            ingestion: ${JSON.stringify(INGESTION_LOG_GROUP)},
            cognition: ${JSON.stringify(COGNITION_LOG_GROUP)},
            dbt: ${JSON.stringify(DBT_LOG_GROUP)},
          };
          return m[key] || m.ingestion;
        },

        async api(action, data = {}) {
          this.loading = true;
          try {
            const res = await fetch(window.location.href, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action, ...data }),
            });
            const j = await res.json();
            if (!res.ok) throw new Error(j.error || 'Request failed');
            return j;
          } finally {
            this.loading = false;
          }
        },

        async startIngestion() {
          try {
            const input = { mode: this.ingestion.mode };
            if (this.ingestion.mode !== 'incremental') input.resource = this.ingestion.resource;
            if (this.ingestion.mode === 'backfill') {
              input.startDate = this.ingestion.startDate;
              input.endDate = this.ingestion.endDate;
            }
            await this.api('startIngestion', { input });
            this.showToast('Ingestion started');
            this.tab = 'executions';
            await this.loadExecutions(false);
          } catch (e) { this.showToast(e.message, 'error'); }
        },

        async startDbt() {
          try {
            const input = {};
            if (this.dbt.select && this.dbt.select.trim()) input.select = this.dbt.select.trim();
            if (this.dbt.fullRefresh) input.fullRefresh = true;
            await this.api('startDbt', { input });
            this.showToast('dbt started');
            this.tab = 'executions';
            await this.loadExecutions(false);
          } catch (e) { this.showToast(e.message, 'error'); }
        },

        async startCognition() {
          try {
            const input = {
              task: this.cognition.task,
              year: this.cognition.year,
              realtime: !!this.cognition.realtime,
            };
            if (this.cognition.limit) input.limit = parseInt(this.cognition.limit, 10);
            await this.api('startCognition', { input });
            this.showToast('Cognition started');
            this.tab = 'executions';
            await this.loadExecutions(false);
          } catch (e) { this.showToast(e.message, 'error'); }
        },

        async startFullPipeline() {
          try {
            const ingestion = { mode: this.full.ingestionMode };
            if (this.full.ingestionMode !== 'incremental') ingestion.resource = this.full.resource;
            if (this.full.ingestionMode === 'backfill') {
              ingestion.startDate = this.full.startDate;
              ingestion.endDate = this.full.endDate;
            }
            const dbt = {};
            if (this.full.dbtSelect && this.full.dbtSelect.trim()) dbt.select = this.full.dbtSelect.trim();
            if (this.full.dbtFullRefresh) dbt.fullRefresh = true;
            const cognition = {
              task: this.full.cognitionTask,
              year: this.full.year,
              realtime: !!this.full.realtime,
            };
            await this.api('startFullPipeline', { input: { ingestion, dbt, cognition } });
            this.showToast('Full pipeline started');
            this.tab = 'executions';
            await this.loadExecutions(false);
          } catch (e) { this.showToast(e.message, 'error'); }
        },

        async loadExecutions(append) {
          try {
            const data = await this.api('listExecutions', {
              nextTokens: append ? this.nextTokens : undefined,
            });
            if (append) {
              const merge = (a, b) => {
                const seen = new Set(a.map((x) => x.executionArn));
                const out = [...a];
                for (const x of b) { if (!seen.has(x.executionArn)) { seen.add(x.executionArn); out.push(x); } }
                return out;
              };
              this.executions.ingestion = merge(this.executions.ingestion, data.ingestion);
              this.executions.cognition = merge(this.executions.cognition, data.cognition);
              this.executions.dbt = merge(this.executions.dbt, data.dbt);
              this.executions.fullPipeline = merge(this.executions.fullPipeline, data.fullPipeline);
            } else {
              this.executions = {
                ingestion: data.ingestion,
                cognition: data.cognition,
                dbt: data.dbt,
                fullPipeline: data.fullPipeline,
              };
            }
            this.nextTokens = data.nextTokens;
          } catch (e) { this.showToast(e.message, 'error'); }
        },

        async loadMore(key) {
          const single = await this.api('listExecutionsSingle', { stateMachine: key, nextToken: this.nextTokens[key] });
          const merge = (a, b) => {
            const seen = new Set(a.map((x) => x.executionArn));
            const out = [...a];
            for (const x of b) { if (!seen.has(x.executionArn)) { seen.add(x.executionArn); out.push(x); } }
            return out;
          };
          this.executions[key] = merge(this.executions[key], single.executions);
          this.nextTokens[key] = single.nextToken;
        },

        async openExecution(exec) {
          try {
            const data = await this.api('getExecution', { executionArn: exec.executionArn });
            this.selectedExecution = data;
            this.historyText = '';
            this.historyNextToken = null;
            this.logsText = '';
            this.logsNextToken = null;
            await this.loadHistory(true);
            await this.fetchLogs(true);
          } catch (e) { this.showToast(e.message, 'error'); }
        },

        closeExecution() {
          this.selectedExecution = null;
          this.historyText = '';
          this.historyNextToken = null;
          this.logsText = '';
          this.logsNextToken = null;
        },

        openLogs(key) {
          this.logGroupChoice = key;
          this.logsText = '';
          this.logsNextToken = null;
          this.fetchLogs(true);
        },

        async loadHistory(reset) {
          if (!this.selectedExecution) return;
          try {
            const data = await this.api('getExecutionHistory', {
              executionArn: this.selectedExecution.executionArn,
              nextToken: reset ? undefined : this.historyNextToken,
            });
            const lines = (data.events || []).map((ev) => {
              const t = ev.timestamp ? new Date(ev.timestamp).toISOString() : '';
              let line = '';
              try {
                line = t + ' ' + JSON.stringify(ev).slice(0, 800);
              } catch {
                line = t + ' (event)';
              }
              return line;
            });
            this.historyText = reset ? lines.join('\\n') : (this.historyText + '\\n' + lines.join('\\n'));
            this.historyNextToken = data.nextToken;
          } catch (e) { this.showToast(e.message, 'error'); }
        },

        async fetchLogs(reset) {
          const groupKey = this.logGroupChoice || 'ingestion';
          const logGroupName = this.logGroupName(groupKey);
          const startTime = this.selectedExecution && this.selectedExecution.startDate
            ? new Date(this.selectedExecution.startDate).getTime() - 60000
            : undefined;
          try {
            const data = await this.api('getLogs', {
              logGroupName,
              startTime: reset ? startTime : undefined,
              nextToken: reset ? undefined : this.logsNextToken,
            });
            const lines = (data.events || []).map((e) => (e.message || ''));
            this.logsText = reset ? lines.join('\\n') : (this.logsText + '\\n' + lines.join('\\n'));
            this.logsNextToken = data.nextToken;
          } catch (e) { this.showToast(e.message, 'error'); }
        },

        async maybeStreamLogs() {
          if (!this.logStreamEnabled || !this.selectedExecution) return;
          if (this.selectedExecution.status !== 'RUNNING') return;
          await this.fetchLogs(false);
        },

        async stopExec(executionArn) {
          if (!confirm('Stop this execution?')) return;
          try {
            await this.api('stopExecution', { executionArn });
            this.showToast('Stopped');
            await this.loadExecutions(false);
          } catch (e) { this.showToast(e.message, 'error'); }
        },
      };
    }
  </script>
</body>
</html>`;

const ARN_BY_KEY: Record<ExecutionListKey, string> = {
  ingestion: INGESTION_STATE_MACHINE_ARN,
  cognition: COGNITION_STATE_MACHINE_ARN,
  dbt: DBT_STATE_MACHINE_ARN,
  fullPipeline: FULL_PIPELINE_STATE_MACHINE_ARN,
};

export const handler = async (event: LambdaEvent) => {
  const method = event.requestContext.http.method;

  if (method === 'GET') {
    return html(HTML_PAGE);
  }

  if (method === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}') as Record<string, unknown>;
      const { action } = body;

      switch (action) {
        case 'startIngestion': {
          const result = await startExecution(
            INGESTION_STATE_MACHINE_ARN,
            body.input as Record<string, unknown>,
          );
          return json({ executionArn: result.executionArn });
        }

        case 'startDbt': {
          const result = await startExecution(
            DBT_STATE_MACHINE_ARN,
            (body.input as Record<string, unknown>) ?? {},
          );
          return json({ executionArn: result.executionArn });
        }

        case 'startCognition': {
          const result = await startExecution(
            COGNITION_STATE_MACHINE_ARN,
            body.input as Record<string, unknown>,
          );
          return json({ executionArn: result.executionArn });
        }

        case 'startFullPipeline': {
          const result = await startExecution(
            FULL_PIPELINE_STATE_MACHINE_ARN,
            body.input as Record<string, unknown>,
          );
          return json({ executionArn: result.executionArn });
        }

        case 'listExecutions': {
          const data = await listAllExecutionPages({
            maxResults: typeof body.maxResults === 'number' ? body.maxResults : undefined,
            nextTokens: body.nextTokens as Partial<Record<ExecutionListKey, string | undefined>> | undefined,
          });
          return json(data);
        }

        case 'listExecutionsSingle': {
          const sm = body.stateMachine as ExecutionListKey;
          if (!sm || !ARN_BY_KEY[sm]) {
            return json({ error: 'Invalid stateMachine' }, 400);
          }
          const token =
            typeof body.nextToken === 'string' && body.nextToken.length > 0
              ? body.nextToken
              : undefined;
          const page = await listExecutionsPage(ARN_BY_KEY[sm], EXECUTION_PAGE_SIZE, token);
          return json({ executions: page.executions, nextToken: page.nextToken });
        }

        case 'getExecution': {
          const execution = await getExecution(body.executionArn as string);
          return json(execution);
        }

        case 'getExecutionHistory': {
          const hist = await getExecutionHistoryPage(
            body.executionArn as string,
            40,
            typeof body.nextToken === 'string' ? body.nextToken : undefined,
          );
          return json(hist);
        }

        case 'stopExecution': {
          await stopExecution(body.executionArn as string);
          return json({ success: true });
        }

        case 'getLogs': {
          const events = await getLogsPage({
            logGroupName: body.logGroupName as string,
            startTime: typeof body.startTime === 'number' ? body.startTime : undefined,
            nextToken: typeof body.nextToken === 'string' ? body.nextToken : undefined,
            limit: typeof body.limit === 'number' ? body.limit : undefined,
          });
          return json(events);
        }

        default:
          return json({ error: 'Unknown action' }, 400);
      }
    } catch (error) {
      console.error('API error:', error);
      return json(
        { error: error instanceof Error ? error.message : 'Internal error' },
        500,
      );
    }
  }

  return json({ error: 'Method not allowed' }, 405);
};
