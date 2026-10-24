# Report Agent API — sample calls

How to call the Report Agent from HTTP. No auth header is required on these routes today (same as the Console). Always send `tenantId` so EZOFIS lists and instance counts use the right tenant.

Local base URL:

```text
http://localhost:8011
```

Sample tenant used below:

```text
b843b988-00ec-44e3-aca2-b8470133ef63
```

Architecture notes: `docs/report-agent.md`.

Typical client flow:

```text
1. GET  /api/report-agent/types
2. GET  /api/report-agent/scope-options?scope=workflows&tenantId=…
3. POST /api/report-agent/generate-prompt     → JSON prompt + reportSpec
4. UI adds/removes Default / Userdefined / Agent columns
5. POST /api/report-agent/run                 → columns + rows (uses schemaTables)
6. POST /api/report-agent/reports             → save (optional)
```

`reportPrompt` is JSON (not prose). The UI edits it, then Run uses the selected columns plus `schemaTables` / `sourceTable`.

Headers for every POST:

```http
Content-Type: application/json
```

---

## 1. List report types

```http
GET /api/report-agent/types
```

```bash
curl -s http://localhost:8011/api/report-agent/types
```

Sample response:

```json
[
  {
    "key": "all_workflows",
    "name": "All Workflows",
    "description": "Report across all workflows based on the user description.",
    "scope": "workflows",
    "requiredParams": [],
    "exampleDescription": "Aging, SLA, Total Inbox, or Total tickets processed"
  },
  {
    "key": "specific_workflow",
    "name": "Specified Workflow",
    "description": "Report for one workflow. Requires workflow name.",
    "scope": "workflows",
    "requiredParams": ["workflowName"],
    "exampleDescription": "Total Approved with Score"
  },
  {
    "key": "all_repositories",
    "name": "All Repositories",
    "description": "Report across all repositories based on the user description.",
    "scope": "repositories",
    "requiredParams": [],
    "exampleDescription": "Total documents, Document aging, or Document Retention Status"
  },
  {
    "key": "specific_repository",
    "name": "Specified Repository",
    "description": "Report for one repository. Requires repository name.",
    "scope": "repositories",
    "requiredParams": ["repositoryName"],
    "exampleDescription": "Total Signed Documents"
  }
]
```

| `reportType` | Extra body field |
|---|---|
| `all_workflows` | none |
| `specific_workflow` | `workflowName` (required) |
| `all_repositories` | none |
| `specific_repository` | `repositoryName` (required) |

---

## 2. List workflows or repositories

```http
GET /api/report-agent/scope-options?scope=workflows&tenantId={tenantId}
GET /api/report-agent/scope-options?scope=repositories&tenantId={tenantId}
```

`scope` must be `workflows` or `repositories`.

```bash
curl -s "http://localhost:8011/api/report-agent/scope-options?scope=workflows&tenantId=b843b988-00ec-44e3-aca2-b8470133ef63"
```

Sample response:

```json
[
  { "id": "…", "name": "Accounts Payable" },
  { "id": "…", "name": "RFQ Process" },
  { "id": "…", "name": "Quote Request Process" }
]
```

Use `name` as `workflowName` / `repositoryName` on generate and run.

---

## 3. Phase 1 — generate prompt

```http
POST /api/report-agent/generate-prompt
```

### Request body

| Field | Required | Notes |
|---|---|---|
| `reportType` | yes | One of the four keys above |
| `description` | yes | Chip text or free text (`Aging`, `RFQ Estimation Report`, …) |
| `tenantId` | recommended | EZOFIS tenant |
| `workflowName` | if specified workflow | Exact picker name |
| `repositoryName` | if specified repository | Exact picker name |
| `model` | no | Override catalog `report` model |

### 3a. All Workflows — Aging (recommended path)

Generate and run **match** (3 columns). Use this pattern from an app.

```bash
curl -s -X POST http://localhost:8011/api/report-agent/generate-prompt \
  -H "Content-Type: application/json" \
  -d "{
    \"reportType\": \"all_workflows\",
    \"description\": \"Aging\",
    \"tenantId\": \"b843b988-00ec-44e3-aca2-b8470133ef63\"
  }"
```

Other `description` values that have recipes:

- `Total Inbox`
- `SLA`
- `Total tickets processed`

Sample generate response (shape). `reportPrompt` is the JSON the UI should show and edit:

```json
{
  "reportType": "all_workflows",
  "title": "Aging",
  "reportPrompt": "{ \"Objective\": \"Open requests across all workflows…\", \"Userdefined Columns\": […], \"Default columns\": […], \"Agent generated columns\": […], \"Formula\": […], \"Sort\": {…}, \"schemaTables\": [\"workflow.workflow_instances_all\"] }",
  "schemaTables": ["workflow.workflow_instances_all"],
  "reportSpec": {
    "title": "Aging",
    "objective": "Open requests across all workflows, grouped by aging bucket and workflow.",
    "reportType": "all_workflows",
    "columns": [
      {
        "key": "Aging_Bucket",
        "label": "Aging Bucket",
        "formula": "CASE WHEN (CURRENT_DATE - CAST(createdAtUtc AS date)) <= 5 THEN '0-5' WHEN (CURRENT_DATE - CAST(createdAtUtc AS date)) <= 15 THEN '6-15' WHEN (CURRENT_DATE - CAST(createdAtUtc AS date)) <= 30 THEN '16-30' ELSE '30+' END",
        "editable": true
      },
      { "key": "workflowName", "label": "Workflow", "formula": null, "editable": true },
      { "key": "Request_Count", "label": "Count", "formula": "COUNT(*)", "editable": true }
    ],
    "filters": [
      { "field": "completedAtUtc", "op": "is_null", "value": null, "editable": true }
    ],
    "groupBy": ["Aging_Bucket", "workflowName"],
    "sort": { "field": "Request_Count", "direction": "desc" },
    "availableColumns": [
      "workflowName", "status", "startedBy", "createdAtUtc",
      "startedAtUtc", "completedAtUtc", "id", "workflowId"
    ],
    "sourceSchema": "workflow",
    "sourceTable": "workflow_instances_all",
    "warnings": []
  },
  "warnings": [
    "All Workflows is scoped to 11 tenant workflows: Accounts Payable, …",
    "Prompt model failed (…); used schema-backed short prompt."
  ],
  "schemaTables": ["workflow.workflow_instances_all"],
  "durationMs": 2100
}
```

Keep `reportSpec` and send it unchanged (or after UI edits) to Phase 2.

### 3b. Specified workflow — RFQ Estimation Report

```bash
curl -s -X POST http://localhost:8011/api/report-agent/generate-prompt \
  -H "Content-Type: application/json" \
  -d "{
    \"reportType\": \"specific_workflow\",
    \"description\": \"RFQ Estimation Report\",
    \"workflowName\": \"RFQ Process\",
    \"tenantId\": \"b843b988-00ec-44e3-aca2-b8470133ef63\"
  }"
```

Sample generate response (live):

```json
{
  "reportType": "specific_workflow",
  "title": "RFQ Estimation Report",
  "reportPrompt": "Report objective: RFQ Estimation Report\n\nReport type and scope: Report type is specific_workflow. Workflow name is RFQ Process.\n\nData sources: Use the table dbo.ezfb_787372d8_items. …\n\nOutput columns: Company_Name as Company Name.",
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
      "Project_type", "Project", "Flags", "Reasoning", "Company_Name",
      "Invoice_Type", "Billing_Address", "Email", "Shipping_Address", "Contact",
      "Date", "Order_Number", "Quote_2_Order_Number", "Quote_3_Order_Number",
      "Phone_Number", "Payment_Terms",
      "Subtotal", "quote_2_Subtotal", "quote_3_Subtotal",
      "Freight", "quote_2_Freight", "quote_3_Freight",
      "HST", "quote_2_HST", "quote_3_HST",
      "Total", "quote_2_Total", "quote_3_Total",
      "Remarks", "quote_2_Remarks", "quote_3_Remarks",
      "Discount", "quote_2_Discount", "quote_3_Discount"
    ],
    "sourceSchema": "dbo",
    "sourceTable": "ezfb_787372d8_items",
    "warnings": [
      "Columns taken from 'RFQ Process' in EZOFIS, not from another workflow or repository.",
      "Prompt model failed (…); used schema-backed short prompt."
    ]
  },
  "schemaTables": ["dbo.ezfb_787372d8_items"],
  "durationMs": 2725.2
}
```

You may add chips from `availableColumns` before run, for example:

```json
"columns": [
  { "key": "Company_Name", "label": "Company Name" },
  { "key": "Order_Number", "label": "Order Number" },
  { "key": "Date", "label": "Date" },
  { "key": "Total", "label": "Total" },
  { "key": "quote_2_Total", "label": "Quote 2 Total" },
  { "key": "quote_3_Total", "label": "Quote 3 Total" }
]
```

**Do not run this spec yet if you need form rows.** Specified workflow still locks against local Postgres and returns one `Name` column. See §6.

### 3c. All Repositories — Total documents

```bash
curl -s -X POST http://localhost:8011/api/report-agent/generate-prompt \
  -H "Content-Type: application/json" \
  -d "{
    \"reportType\": \"all_repositories\",
    \"description\": \"Total documents\",
    \"tenantId\": \"b843b988-00ec-44e3-aca2-b8470133ef63\"
  }"
```

`reportSpec.sourceTable` is `items_all`. Columns: `Repository_Name`, `Status`, `Document_Count`.

---

## 4. Phase 2 — run report

```http
POST /api/report-agent/run
```

Send the **same** `reportSpec` from generate (camelCase keys: `sourceTable`, `groupBy`, `availableColumns`).

| Field | Required | Notes |
|---|---|---|
| `reportSpec` | yes (or `reportPrompt`) | Prefer `reportSpec` |
| `reportType` | yes | Same as generate |
| `tenantId` | recommended | |
| `workflowName` / `repositoryName` | if specified | Same as generate |
| `page` | no | default `1` |
| `pageSize` | no | default `25`, max `500` |
| `includeDebug` | no | `true` returns `debug.sql` / lock definition |

### 4a. All Workflows Aging (works)

```bash
curl -s -X POST http://localhost:8011/api/report-agent/run \
  -H "Content-Type: application/json" \
  -d "{
    \"reportType\": \"all_workflows\",
    \"tenantId\": \"b843b988-00ec-44e3-aca2-b8470133ef63\",
    \"page\": 1,
    \"pageSize\": 25,
    \"reportSpec\": {
      \"title\": \"Aging\",
      \"objective\": \"Open requests across all workflows, grouped by aging bucket and workflow.\",
      \"reportType\": \"all_workflows\",
      \"columns\": [
        { \"key\": \"Aging_Bucket\", \"label\": \"Aging Bucket\", \"formula\": \"CASE WHEN (CURRENT_DATE - CAST(createdAtUtc AS date)) <= 5 THEN '0-5' WHEN (CURRENT_DATE - CAST(createdAtUtc AS date)) <= 15 THEN '6-15' WHEN (CURRENT_DATE - CAST(createdAtUtc AS date)) <= 30 THEN '16-30' ELSE '30+' END\" },
        { \"key\": \"workflowName\", \"label\": \"Workflow\" },
        { \"key\": \"Request_Count\", \"label\": \"Count\", \"formula\": \"COUNT(*)\" }
      ],
      \"filters\": [{ \"field\": \"completedAtUtc\", \"op\": \"is_null\", \"value\": null }],
      \"groupBy\": [\"Aging_Bucket\", \"workflowName\"],
      \"sort\": { \"field\": \"Request_Count\", \"direction\": \"desc\" },
      \"availableColumns\": [\"workflowName\", \"status\", \"startedBy\", \"createdAtUtc\", \"completedAtUtc\"],
      \"sourceSchema\": \"workflow\",
      \"sourceTable\": \"workflow_instances_all\"
    }
  }"
```

Sample run response:

```json
{
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
```

`sourceTable` `workflow_instances_all` or `items_all` → EZOFIS catalog count (no SQL). Generate columns **equal** run columns.

### 4b. Specified RFQ (broken until scope reset)

If you POST the RFQ `reportSpec` (`sourceTable`: `ezfb_787372d8_items`), run currently returns:

```json
{
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
```

Do not use specified workflow/repository from an API client until Run uses the same EZOFIS form schema as Generate.

---

## 5. Save and replay from the library

### Save

```http
POST /api/report-agent/reports
```

```bash
curl -s -X POST http://localhost:8011/api/report-agent/reports \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Workflow Aging\",
    \"description\": \"Aging\",
    \"tenantId\": \"b843b988-00ec-44e3-aca2-b8470133ef63\",
    \"reportType\": \"all_workflows\",
    \"status\": \"Draft\",
    \"reportPrompt\": \"…from generate…\",
    \"reportSpec\": { }
  }"
```

`reportSpec` is the Phase 1 object. Response includes `id`.

### List

```http
GET /api/report-agent/reports?tenantId={tenantId}
```

Optional: `status`, `domain`, `q`, `favoriteOnly=true`.

### Get one

```http
GET /api/report-agent/reports/{id}?tenantId={tenantId}
```

### Update / publish / favorite

```http
PATCH /api/report-agent/reports/{id}?tenantId={tenantId}
```

```json
{ "status": "Published", "favorite": true }
```

### Delete

```http
DELETE /api/report-agent/reports/{id}?tenantId={tenantId}
```

```json
{ "ok": true }
```

### Run a saved report

```http
POST /api/report-agent/reports/{id}/run?tenantId={tenantId}&page=1&pageSize=25
```

Same `RunReportResponse` as `POST /run`.

---

## 6. Recipe catalog (optional)

```http
GET /api/report-agent/catalog
```

Named recipes (Aging, Total Inbox, SLA, …). Library cards come from `/reports`, not this list.

---

## 7. Errors

| HTTP | When |
|---|---|
| 400 | Missing `description`, missing `workflowName` / `repositoryName`, bad type |
| 404 | Saved report not found |
| 500 | Unexpected failure |
| 503 | Database / tenant DB unavailable |

Sample 400:

```json
{ "detail": "workflowName is required for specific_workflow." }
```

---

## 8. Minimal client (Python)

```python
import json, urllib.request

BASE = "http://localhost:8011"
TENANT = "b843b988-00ec-44e3-aca2-b8470133ef63"

def post(path, payload):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode())

gen = post("/api/report-agent/generate-prompt", {
    "reportType": "all_workflows",
    "description": "Aging",
    "tenantId": TENANT,
})
run = post("/api/report-agent/run", {
    "reportType": "all_workflows",
    "tenantId": TENANT,
    "page": 1,
    "pageSize": 25,
    "reportSpec": gen["reportSpec"],
})
print([c["key"] for c in run["columns"]])
print(run["totalCount"], "rows")
print(run["rows"][:3])
```

---

## 9. What works from an API client today

| Call | Generate | Run |
|---|---|---|
| All Workflows + Aging / Inbox / SLA / tickets processed | 2–3 columns | **same columns**, live EZOFIS counts |
| All Repositories + Total documents | 3 columns | **same columns** |
| Specified workflow (RFQ, AP, …) | Form fields in `availableColumns` | **Do not use** — lock returns `Name` from `Workflows` |
| Specified repository | Designer fields | **Do not use** — same lock path |

Filter ops on `reportSpec.filters`: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `like`, `is_null`, `not_null`.
