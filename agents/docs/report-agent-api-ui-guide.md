# Report Agent — API & UI Integration Guide

Product: ezofis V6 (cloud.ezofis.com)  
Agents service: FastAPI (`/chat` and `/api/report-agent/*`)  
V6 API: ASP.NET (`/api/...`)  
UI: React SPA calls **V6 API only** (not Agents directly)

UI → V6 API → Agents `/chat` → Report Agent

Local Agents (dev): `http://localhost:8011`  
Sample tenant: `b843b988-00ec-44e3-aca2-b8470133ef63`

---

# PART A — For API Team (how API calls the Agent)

## 1. Purpose

The Report Agent builds a report in two phases:

| Phase | Meaning |
|---|---|
| `prompt` (default) | From user description → generate `reportPrompt` + short editable `reportSpec` |
| `run` | Execute report using `reportPrompt` and/or client-edited `reportSpec` → return rows |

The model never writes SQL. Python locks names, builds SQL, or counts live EZOFIS catalogs.

## 2. Downstream endpoint (Agents `/chat`)

Same pattern as OCR / chatbot proxy.

| Item | Value |
|---|---|
| Method | POST |
| URL | `Agents:ChatUrl` (prod example: `https://cloud.ezofis.com/chat`; local: `http://localhost:8011/chat`) |
| Content-Type | application/json |
| Auth to Agents | As configured for other agent intents (same as OCR / chatbot proxy) |

Config key: `Agents:ChatUrl`

Agents also expose REST (optional, Console uses these today):

| V6 should prefer | Agents REST (same engine) |
|---|---|
| POST `/api/reports/agent/prompt` | POST `/api/report-agent/generate-prompt` |
| POST `/api/reports/agent/run` | POST `/api/report-agent/run` |

UI must still call **V6**, not Agents REST.

## 3. Request envelope (Agents `/chat`)

### Phase 1 — Generate prompt + reportSpec

```json
{
  "session_id": "report-{guid}",
  "intent": "report",
  "message": "Aging",
  "payload": {
    "phase": "prompt",
    "tenant_id": "{tenant-guid}",
    "report_type": "all_workflows",
    "description": "Aging",
    "workflow_name": null,
    "repository_name": null,
    "model": null
  }
}
```

Specified workflow example (RFQ Estimation Report):

```json
{
  "session_id": "report-{guid}",
  "intent": "report",
  "message": "RFQ Estimation Report",
  "payload": {
    "phase": "prompt",
    "tenant_id": "{tenant-guid}",
    "report_type": "specific_workflow",
    "description": "RFQ Estimation Report",
    "workflow_name": "RFQ Process",
    "repository_name": null
  }
}
```

### Phase 2 — Run report (after UI edits reportSpec)

```json
{
  "session_id": "report-{guid}",
  "intent": "report",
  "message": "",
  "payload": {
    "phase": "run",
    "tenant_id": "{tenant-guid}",
    "report_type": "all_workflows",
    "report_prompt": "…text from phase 1…",
    "reportSpec": {
      "title": "Aging",
      "objective": "Open requests across all workflows, grouped by aging bucket and workflow.",
      "reportType": "all_workflows",
      "columns": [
        { "key": "Aging_Bucket", "label": "Aging Bucket", "formula": "CASE WHEN (CURRENT_DATE - CAST(createdAtUtc AS date)) <= 5 THEN '0-5' WHEN (CURRENT_DATE - CAST(createdAtUtc AS date)) <= 15 THEN '6-15' WHEN (CURRENT_DATE - CAST(createdAtUtc AS date)) <= 30 THEN '16-30' ELSE '30+' END", "editable": true },
        { "key": "workflowName", "label": "Workflow", "editable": true },
        { "key": "Request_Count", "label": "Count", "formula": "COUNT(*)", "editable": true }
      ],
      "filters": [
        { "field": "completedAtUtc", "op": "is_null", "value": null, "editable": true }
      ],
      "groupBy": ["Aging_Bucket", "workflowName"],
      "sort": { "field": "Request_Count", "direction": "desc" },
      "availableColumns": ["workflowName", "status", "startedBy", "createdAtUtc", "completedAtUtc"],
      "sourceSchema": "workflow",
      "sourceTable": "workflow_instances_all",
      "warnings": []
    },
    "page": 1,
    "pageSize": 25,
    "filters": {},
    "includeDebug": false
  }
}
```

### Rules for API team

- `intent` must be `"report"`.
- `payload.tenant_id` is required for EZOFIS catalog / tenant DB.
- Phase `run` needs `report_prompt` or `reportSpec` (at least one). Prefer sending **both**; UI edits live in `reportSpec`.
- Accept both camelCase and snake_case (`reportSpec` / `report_spec`, `pageSize` / `page_size`, `tenant_id` / `tenantId`).
- Keep the same `session_id` across prompt → run for one user session.
- Forward `X-Tenant-Id` if that is how other agent proxies send tenant.

## 4. report_type values

| Value | Scope | Extra field |
|---|---|---|
| `all_workflows` | All workflows | none |
| `specific_workflow` | One workflow | `workflow_name` required |
| `all_repositories` | All repositories | none |
| `specific_repository` | One repository | `repository_name` required |

Picker lists (Agents REST, optional for V6 to proxy):

- `GET /api/report-agent/scope-options?scope=workflows&tenantId={tenantId}`
- `GET /api/report-agent/scope-options?scope=repositories&tenantId={tenantId}`

Use `name` from the list as `workflow_name` / `repository_name`.

Descriptions that have recipes today:

| report_type | description chips |
|---|---|
| all_workflows | Aging, SLA, Total Inbox, Total tickets processed |
| all_repositories | Total documents, Document aging, Document Retention Status |
| specific_workflow | AP recipes only when workflow is Accounts Payable |

## 5. Response (Agents)

Agents return a chat envelope. Report data is in `report_result`.

### Phase 1 response (shape)

```json
{
  "reply": "Report prompt generated.",
  "report_result": {
    "reportType": "all_workflows",
    "title": "Aging",
    "reportPrompt": "Report objective: Open requests across all workflows…",
    "reportSpec": {
      "title": "Aging",
      "objective": "Open requests across all workflows, grouped by aging bucket and workflow.",
      "reportType": "all_workflows",
      "columns": [
        { "key": "Aging_Bucket", "label": "Aging Bucket", "formula": "CASE …", "editable": true },
        { "key": "workflowName", "label": "Workflow", "editable": true },
        { "key": "Request_Count", "label": "Count", "formula": "COUNT(*)", "editable": true }
      ],
      "filters": [{ "field": "completedAtUtc", "op": "is_null", "value": null, "editable": true }],
      "groupBy": ["Aging_Bucket", "workflowName"],
      "sort": { "field": "Request_Count", "direction": "desc" },
      "availableColumns": ["workflowName", "status", "startedBy", "createdAtUtc", "startedAtUtc", "completedAtUtc", "id", "workflowId"],
      "sourceSchema": "workflow",
      "sourceTable": "workflow_instances_all",
      "warnings": []
    },
    "warnings": [],
    "schemaTables": ["workflow.workflow_instances_all"],
    "durationMs": 2100
  }
}
```

### Phase 1 — RFQ Estimation Report (live generate)

```json
{
  "reply": "Report prompt generated.",
  "report_result": {
    "reportType": "specific_workflow",
    "title": "RFQ Estimation Report",
    "reportPrompt": "Report objective: RFQ Estimation Report\n\nReport type and scope: Report type is specific_workflow. Workflow name is RFQ Process.\n\nData sources: Use the table dbo.ezfb_787372d8_items.",
    "reportSpec": {
      "title": "RFQ Estimation Report",
      "objective": "RFQ Estimation Report",
      "reportType": "specific_workflow",
      "columns": [
        { "key": "Company_Name", "label": "Company Name", "formula": null, "editable": true }
      ],
      "filters": [],
      "groupBy": [],
      "sort": { "field": "Company_Name", "direction": "desc" },
      "availableColumns": [
        "Company_Name", "Order_Number", "Date", "Email", "Payment_Terms",
        "Subtotal", "Freight", "HST", "Total",
        "quote_2_Total", "quote_3_Total"
      ],
      "sourceSchema": "dbo",
      "sourceTable": "ezfb_787372d8_items",
      "warnings": [
        "Columns taken from 'RFQ Process' in EZOFIS, not from another workflow or repository."
      ]
    },
    "schemaTables": ["dbo.ezfb_787372d8_items"],
    "durationMs": 2725.2
  }
}
```

UI may add columns from `availableColumns` before Run (Order_Number, Date, Total, quote_2_Total, quote_3_Total).

### Phase 2 response (shape) — All Workflows Aging (works)

```json
{
  "reply": "Report ready: Aging (13 rows).",
  "report_result": {
    "title": "Aging",
    "reportType": "all_workflows",
    "columns": [
      { "key": "Aging_Bucket", "label": "Aging Bucket" },
      { "key": "workflowName", "label": "Workflow" },
      { "key": "Request_Count", "label": "Count" }
    ],
    "rows": [
      { "Aging_Bucket": "0-5", "workflowName": "Quote Request Process", "Request_Count": 49 }
    ],
    "totalCount": 13,
    "page": 1,
    "pageSize": 25,
    "filters": [],
    "summary": {},
    "warnings": [
      "Counted live EZOFIS workflow instances across the tenant catalog."
    ],
    "durationMs": 4200,
    "debug": null
  }
}
```

### Phase 2 — specified RFQ (do not ship to UI yet)

Run currently locks against local Postgres, drops `ezfb_*`, and returns one catalog column:

```json
{
  "reply": "Report ready: RFQ Estimation Report (1 rows).",
  "report_result": {
    "title": "RFQ Estimation Report",
    "reportType": "specific_workflow",
    "columns": [{ "key": "Name", "label": "Name" }],
    "rows": [{ "Name": "Accounts Payable" }],
    "totalCount": 1,
    "warnings": [
      "Dropped unknown source table 'ezfb_787372d8_items'.",
      "Dropped unknown column source 'Company_Name'.",
      "Redirected report source from catalog/definition table to workflow.Workflows."
    ]
  }
}
```

**Ship All Workflows / All Repositories Run to UI now. Hold Specified Workflow / Specified Repository Run until Agents execute EZOFIS form rows.**

## 6. What V6 API should expose to UI (recommended)

UI must not call Agents directly. API team should proxy, same pattern as chatbot:

| UI calls V6 | API forwards to Agents |
|---|---|
| POST `/api/reports/agent/prompt` | `/chat` intent=report, phase=prompt |
| POST `/api/reports/agent/run` | `/chat` intent=report, phase=run |
| GET `/api/reports/agent/types` | GET `/api/report-agent/types` (optional) |
| GET `/api/reports/agent/scope-options?scope=workflows` | GET `/api/report-agent/scope-options` |

### Suggested V6 request (prompt)

```json
{
  "sessionId": "report-{guid}",
  "description": "Aging",
  "reportType": "all_workflows",
  "workflowName": null,
  "repositoryName": null
}
```

### Suggested V6 request (run)

```json
{
  "sessionId": "report-{guid}",
  "reportType": "all_workflows",
  "reportPrompt": "…",
  "reportSpec": { },
  "page": 1,
  "pageSize": 25,
  "filters": {},
  "sort": { "field": "Request_Count", "direction": "desc" }
}
```

Suggested V6 response: return only `report_result` (unwrap Agents envelope), plus HTTP errors on timeout/failure.

Headers API must require from UI:

- `Authorization: Bearer {accessToken}`
- `X-Tenant-Id: {tenantId}` (or existing tenant resolution header used by other APIs)

Map V6 camelCase → Agents payload snake_case:

| V6 body | Agents `payload` |
|---|---|
| sessionId | session_id (top-level `/chat`) |
| description | description and message |
| reportType | report_type |
| workflowName | workflow_name |
| repositoryName | repository_name |
| reportPrompt | report_prompt |
| reportSpec | reportSpec (keep camelCase inside spec) |
| pageSize | pageSize or page_size |
| tenant from header | tenant_id |

## 7. Errors API should map

| Agents / situation | HTTP to UI |
|---|---|
| Missing tenant / bad body / missing workflowName | 400 |
| Unauthorized | 401 |
| `report_result: null` with reply text | 400 or 422 with `reply` as error message |
| Agents down | 502 |
| Agents timeout | 504 + clear message |

---

# PART B — For UI Team (how UI calls the API)

## 1. Rule

UI → V6 API only.  
Do not call `https://cloud.ezofis.com/chat` from the browser.  
Do not call `http://localhost:8011/api/report-agent/*` from the browser in production.

## 2. Auth (same as Ask AI / other V6 calls)

```
Authorization: Bearer {accessToken}
X-Tenant-Id: {tenantId}
Content-Type: application/json
```

Get token/tenant from the same place as chatbot (`authUserStore` / identity).

## 3. Screen flow

1. User enters description (and optional report type / workflow / repository).
2. UI calls **Prompt** API.
3. Show editable Prompt text + editable `reportSpec` (title, columns, filters, groupBy, sort).
4. User edits `reportSpec` (and optionally prompt). Offer `availableColumns` as add-column list.
5. UI calls **Run** API with edited `reportPrompt` + `reportSpec`.
6. Render `columns` + `rows` + paging from the response.
7. Keep one `sessionId` (e.g. `crypto.randomUUID()`) for the whole wizard session.

Until specified-workflow Run is fixed: if `reportType` is `specific_workflow` or `specific_repository`, allow Generate Prompt + edit spec, but disable Run or show a banner.

## 4. UI → API contracts

### Step A — Generate prompt

`POST /api/reports/agent/prompt`  
(use the final path API team ships; names above are the intended contract)

Body:

```json
{
  "sessionId": "3f2c…",
  "description": "Aging",
  "reportType": "all_workflows",
  "workflowName": null,
  "repositoryName": null
}
```

Use from response:

| Field | UI use |
|---|---|
| reportPrompt | Editable textarea |
| reportSpec | Bind to form (title, columns, filters, groupBy, sort) |
| reportSpec.availableColumns | + Add column list |
| reportSpec.sourceTable | Debug / do not show as a user field unless needed |
| warnings | Banners |

### Step B — Run report

`POST /api/reports/agent/run`

Body:

```json
{
  "sessionId": "3f2c…",
  "reportType": "all_workflows",
  "reportPrompt": "…edited or original prompt…",
  "reportSpec": {
    "title": "Aging",
    "objective": "Open requests across all workflows",
    "reportType": "all_workflows",
    "columns": [
      { "key": "Aging_Bucket", "label": "Aging Bucket", "editable": true },
      { "key": "workflowName", "label": "Workflow", "editable": true },
      { "key": "Request_Count", "label": "Count", "editable": true }
    ],
    "filters": [
      { "field": "completedAtUtc", "op": "is_null", "value": null, "editable": true }
    ],
    "groupBy": ["Aging_Bucket", "workflowName"],
    "sort": { "field": "Request_Count", "direction": "desc" },
    "sourceSchema": "workflow",
    "sourceTable": "workflow_instances_all"
  },
  "page": 1,
  "pageSize": 25,
  "filters": {},
  "sort": { "field": "Request_Count", "direction": "desc" }
}
```

Use from response:

| Field | UI use |
|---|---|
| title | Page / table title |
| columns[] | Table headers (`key`, `label`) |
| rows[] | Table body (`row[column.key]`) |
| totalCount | Pager |
| page, pageSize | Pager state |
| warnings | Non-blocking messages |

Send the **edited** `reportSpec` on Run so the agent uses UI changes (not only the original prompt).

## 5. reportSpec fields UI can edit

| Field | Type | Notes |
|---|---|---|
| title | string | Report title |
| objective | string | Short goal |
| columns | `{ key, label, formula?, editable }[]` | Visible columns |
| filters | `{ field, op, value, editable }[]` | Default filters (`eq`, `is_null`, `not_null`, …) |
| groupBy | string[] | Grouping keys |
| sort | `{ field, direction }` | `asc` / `desc` |
| sourceTable / sourceSchema | string | Keep from Phase 1; do not invent |

## 6. Loading / empty / error UX

- Prompt call: disable Generate; show “Generating prompt…”
- After prompt: enable Run only when `reportPrompt` or `reportSpec` exists
- Run call: show table skeleton; on error show API error message
- Empty rows: “No rows for this report”
- Do not call Run until Phase 1 succeeded (unless user pasted a full `reportSpec` manually)
- If warnings contain `Dropped unknown source table` or `Redirected report source … Workflows`, show as error (this is the 1-column lock failure)

## 7. Example TypeScript (UI)

```typescript
type ReportSpec = {
  title: string
  objective?: string
  reportType?: string
  columns: { key: string; label: string; formula?: string | null; editable?: boolean }[]
  filters: { field: string; op: string; value?: unknown; editable?: boolean }[]
  groupBy?: string[]
  sort?: { field: string; direction: 'asc' | 'desc' }
  sourceSchema?: string | null
  sourceTable?: string | null
  availableColumns?: string[]
}

async function generateReportPrompt(body: {
  sessionId: string
  description: string
  reportType: string
  workflowName?: string | null
  repositoryName?: string | null
}) {
  const res = await v6Api.post('/api/reports/agent/prompt', body)
  return res.data // { reportPrompt, reportSpec, title, warnings, ... }
}

async function runReport(body: {
  sessionId: string
  reportType: string
  reportPrompt?: string
  reportSpec?: ReportSpec
  page?: number
  pageSize?: number
}) {
  const res = await v6Api.post('/api/reports/agent/run', body)
  return res.data // { title, columns, rows, totalCount, page, pageSize, warnings }
}
```

---

# PART C — Do not confuse with Report Builder CRUD

Separate feature (saved reports, not the AI generate/run loop):

| API | Purpose |
|---|---|
| GET/POST `/api/report-builder` | List / create saved reports (V6) |
| GET `/api/report-builder/{id}/data` | Run saved report (V6) |
| POST `/api/report-builder/preview` | Preview without save (V6) |
| GET/POST `/api/report-agent/reports` | Agents library (`saved_reports`) — optional; do not mix with V6 builder unless product decides one store |

AI Report Agent = generate / edit / run via Agents.  
Report Builder = save / publish / schedule config in V6 DB.

---

# PART D — What works today (for API + UI planning)

| Call | Generate Prompt | Run |
|---|---|---|
| All Workflows + Aging / Inbox / SLA / tickets processed | Yes (2–3 columns) | Yes — same columns, live EZOFIS counts |
| All Repositories + Total documents | Yes | Yes |
| Specified workflow RFQ Estimation Report | Yes — form fields in `availableColumns` | **No** — lock returns `Name` from `Workflows` |
| Specified repository | Yes — designer fields | **No** — same lock path |

Until specified Run is fixed, V6 should still proxy Prompt for all four types, and either:

- proxy Run only when `reportType` is `all_workflows` or `all_repositories`, or  
- proxy Run always and map lock-redirect warnings to 422 so UI does not render a fake one-column table.
