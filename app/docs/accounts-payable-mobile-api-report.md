# Accounts Payable (AP): mobile integration report

**Audience:** the mobile team, working in a new repo with no access to the web source.
This report is self-contained.
**Basis:** read from the web client source. No live API calls were made and no real responses were captured. Every response shape below is what the web client *reads*, not an official contract. Items marked **(unverified)** need confirming with the backend owner. Request payloads are exact because they are copied from the client code.

---

## 1. What you are building (summary)

AP is a "document in, decision out" workflow:

1. User uploads an invoice file. **There is no form.** The app calls the start API straight away.
2. The backend runs an **AP Agent** (OCR, PO match, duplicate check) as a background job.
3. The client polls the job until it finishes, then shows the request with the agent's extracted data and decision.
4. A person approves, rejects or forwards it.

Mobile needs: **sign-in, workflow lookup, list, upload, job tracking, detail, comments and attachments, and actions.**

**Prerequisite: AP must already be set up on the tenant, from the web app.** Setup (folder, forms, PO master data, workflow) is a web-only wizard. On a fresh tenant the workflow list will not contain AP, so there is nothing to show. Ask the web team to run the AP setup wizard (or confirm it was done) before testing.

---

## 2. Environment, auth, headers

| Item | Value |
|---|---|
| Base URL | `https://cloud.ezofis.com/api` (web default; overridable by env var `VITE_V6_BASE_URL`) |
| Content type | `application/json` unless stated |
| Auth header | `Authorization: Bearer <accessToken>` on every call except the pre-login ones |
| Tenant header | `X-Tenant-Id: <tenantId>` on almost every V6 call (login, workflows, forms). Always send it. |

### Sign-in sequence
1. `GET /auth/tenants?email=<email>`, no auth. Returns `{ tenants: [{ tenantId, name }] }`.
   - 0 tenants: show "No organizations found for this email."
   - 1 tenant: continue automatically.
   - More than 1: let the user pick one.
2. `POST /auth/ezofis/login`, no bearer token, header `X-Tenant-Id: <tenantId>`, body `{ "email", "password" }`. Returns an identity object containing `accessToken` and `expiresIn`. Save it together with `tenantId`.
3. `GET /userSession` with bearer and tenant header. Returns the session (user `id`, `email`, `tenantId`, `permissionKeys`, ...). If `tenantId` is missing in the response, fall back to the one you logged in with.
4. Social login (optional): `POST /auth/social/login` with `{ email, provider: "GOOGLE" | "MICROSOFT"..., tenantId }` **(provider list unverified)**.

### Session rules
- On any **HTTP 401**: clear the stored session and send the user to sign-in.
- The web client has an `expiresIn` field but **no refresh-token call** that I could find. Ask the backend how long tokens live and whether a refresh exists **(unverified)**.
- Web cancels an in-flight request when an identical one (same method, url, params) is started. Mobile does not need this, but avoid firing duplicate polls.
- Errors: failed calls return the error text in `response.data` (a string or an object with a message). Show it.

---

## 3. API reference (everything AP needs)

`{wf}` = workflowId (string), `{inst}` = instanceId (also called processId).

### 3.1 Find the AP workflow
| Call | Notes |
|---|---|
| `GET /workflows` | Returns `{ items: [{ id, name, status, triggerType, version, createdAtUtc, description }] }`. Keep `status === 1` (published). |
| `GET /workflows/{wf}` | Returns the full workflow: `id, name, formId / wFormId, flowJson, workflowJson, settings.general.{requestTabs, initiateUsing.formId, isStageBased}`. |
| `GET /Workflows/instance-count?workflowId={wf}` | `{ inboxCount, sentCount, completedCount }` |

**Is this workflow AP?** Yes if the workflow JSON has a block with `type === "AP_AGENT"`. The blocks are at `workflowJson.blocks` or `flowJson.blocks`; the field may be a JSON string, so parse it if it is not an object. Do **not** rely on the name (the web only uses the name "Accounts Payable" to auto-open the upload screen after setup).

### 3.2 Start a request (upload)
`POST /Workflows/{wf}/start`
- Headers: `Authorization`, `X-Tenant-Id`, `Content-Type: multipart/form-data`, `accept: text/plain`.
- Body (multipart): `file` (the invoice), `context` = `""`, `envType` = `"trial"`.
- Success: HTTP 200 or 201. Body may be a JSON string, so parse it if it is a string.
- Read from the response: `instanceId`, `startPayload.transactionId`, `apAgentJobId`.
- If **neither** `instanceId` nor `apAgentJobId` is present, treat it as a failure.
- Web limits: **max 5 files per batch, 50 MB per file, files started one after another.**

### 3.3 Track the job
`GET /Workflows/ap-agent/jobs/{apAgentJobId}` (poll every 5 s). Fields read:

| Field | Meaning |
|---|---|
| `stage` | Current step text. `COMPLETED` or `FAILED` are terminal. If missing the web shows "OCR Extraction". |
| `percent` or `Percent` | Progress number; both casings occur. |
| `message` | Human text. |
| `hangfireStatus` | `Succeeded` / `Failed` (and in-progress values). |
| `isTerminal` | true when finished. |
| `instanceId` | Present once the real request exists. |
| `errorMessage` | Reason on failure. |
| `decision` | Sometimes present at the end. |

### 3.4 Lists
All three take the same params: `workflowId, pageNumber, pageSize, skipTotal=false`, optionally `instanceId`, `transactionId`.

| Call | Use |
|---|---|
| `GET /Workflows/inbox` | Items waiting on the user |
| `GET /Workflows/sent` | Items the user already acted on |
| `GET /Workflows/completed` | Finished items |
| `GET /Workflows/inbox/all-workflows` | Open inbox across every workflow |
| `POST /workflows/by-activity` body `{ activityIds, pageNumber, pageSize, workflowId }` | Items by stage (only for workflows with stage-based tabs) |
| `POST /Workflows/by-activity/counts` body `{ activityIds, workflowId }` | Counts per stage |
| `GET /workflows/{wf}/filter-fields` | Filterable fields (`name, sqlColumnName, dataType`) |
| `GET /workflows/{wf}/control-values/{controlName}` | Option values for a filter |
| `POST /workflows/{wf}/filter/search` | Server-side field filters |

List response: `{ items: [...], totalCount | totalItems | total | meta.{totalCount,totalItems} }`. The payload may be wrapped in `data`. Take the first total that is present and positive, else use the item count.

### 3.5 One request (detail)
There is **no single "get request" call** in the client. The web assembles the detail from several calls:

1. `GET /Workflows/inbox`, `/sent` and `/completed` each with `instanceId={inst}`, page 1, size 5. Pick rows where `workflowInstanceId || processId || id` equals the instance id. If a `transactionId` was opened, use the row with that `transactionId`. Otherwise take the newest row that has no `completedAtUtc` (newest by numeric `transactionId`, else by timestamp).
2. `GET /form/{formId}` for the form definition (`formId` from the row, else the workflow's).
3. `GET /workflows/{wf}/instances/{inst}/history`. See section 6.

Alternative: `GET /Workflows/{wf}/instances/{inst}/locate` finds one request by id regardless of the lists. It is used on the web for deep links; the response shape was not read **(unverified)**.

### 3.6 Attachments, comments, history, preview
| Call | Notes |
|---|---|
| `GET /workflows/{wf}/instances/{inst}/attachments` | Array, or `{ attachments: [] }`, or `{ items: [] }`. Item fields: `id/itemId/fileId, name/fileName, contentType, fileSize, repositoryId, itemId, createdAt/createdAtUtc, uploadedBy/createdByName/createdByEmail, isOriginal, isAiMatch, stageName`. |
| `GET /repositories/{repositoryId}/items/{itemId}/file?disposition=inline` | The file bytes (response type blob). Needs `repositoryId` and `itemId` from the attachment. Add `&_=<value>` to bypass caching. |
| `POST /workflows/{wf}/instances/{inst}/attachments` | Add an attachment (payload not read) **(unverified)**. |
| `GET /workflows/{wf}/instances/{inst}/comments` | List |
| `POST /workflows/{wf}/instances/{inst}/comments` body `{ "comments": "<text>", "showTo": 2 }` | `showTo: 2` is what the web sends; meaning not documented **(unverified)**. |
| `GET /workflows/{wf}/instances/{inst}/history` | Array of stage rows with `agentResponse`; see section 6. |

### 3.7 Actions
`POST /Workflows/instances/{inst}/move-next`, body is a **JSON string** of:

```json
{
  "activityid": "<row.activityId>",
  "activityUserId": "<row.userId || session.id>",
  "AIAGENTHtml": "<row.agentHtml or ''>",
  "AIAGENTResponse": "<row.agentResponse as a string>",
  "comments": "",
  "formData": "<JSON string of the form fields>",
  "formEntryId": 0,
  "formId": "<row.formId || workflow.formId>",
  "instanceId": "<row.workflowInstanceId>",
  "isItemTable": true,
  "itemId": "<row.itemId>",
  "processId": "<row.processId || row.id>",
  "repositoryId": "<row.repositoryId || workflow.repositoryId>",
  "review": "<action name, e.g. Approve>",
  "transactionId": "<row.transactionId>",
  "workflowId": "<wf>"
}
```
- `review` is the action label. Take the allowed actions from the workflow (section 7.3), not a hardcoded list.
- Forward adds `assignToUserId` and `internalForwardUserId: [userId]`.
- Success 200, 201 or 204. A response may contain a **new `apAgentJobId`** (the next stage can be another agent job); if so, track it like an upload.
- `formEntryId` is sent as a number, `0` if absent.
- On the web the form values are first turned into the backend's field-id format. For AP, the minimum is the existing `formData` of the row (`row.formData.fields || row.formData`) sent back unchanged.

### 3.8 Forms
`GET /form/{formId}` returns the form definition (`panels[].fields[]` or `controlList`, plus `secondaryPanels`). Field `id`/`jsonId`/`label`/`type`. Needed only if you show or edit form fields.

---

## 4. The core flow

```
 pick file
    |
    v
 POST /Workflows/{wf}/start  -- error --> show message, stop
    |
    |  { instanceId?, apAgentJobId?, startPayload.transactionId? }
    v
 create local placeholder row  id = instanceId || "job-" + apAgentJobId
    |
    +-- has apAgentJobId ------> poll GET /Workflows/ap-agent/jobs/{id} every 5 s
    |                               |
    |                               +-- instanceId appears -> swap placeholder id for instanceId
    |                               +-- FAILED  -> stop, show failure text, drop in-progress state
    |                               +-- COMPLETED/Succeeded -> fetch inbox+sent+completed once, refresh list + detail
    |
    +-- only instanceId -------> poll /Workflows/sent (fallback /inbox) every 60 s
                                    until stageType != "AP_AGENT" or has decision
```

### Job rules (copy exactly)
- **Completed** = `isTerminal` OR `stage == "COMPLETED"` OR `hangfireStatus == "Succeeded"`.
- **Failed** = `hangfireStatus` equals `failed` (case-insensitive) OR `stage == "FAILED"`. Failure text = `message`, `errorMessage` and `stage` joined.
- Handle each job's completion **once**. Keep a set of finished job ids so you do not refetch or poll again.
- Message rewrites: `"Linking related records"` shows as **"Linking PO Records"**; `"AP Agent finished"` shows as empty.
- While the id is `job-<id>`, do **not** call the detail or history endpoints. They need a real instance id.
- Progress UI the web shows after upload (use as a guide): OCR Extraction, then Matching / PO linking, then AP Agent Decision.

### Without a job id
Row is "done" when `stageType !== "AP_AGENT"`, or it has a decision (`review`, `agentResponse.decision`, `completedAtUtc`), or the `stage` is `Verifier`, `Approved` or `Completed`.

### Mobile-specific
- Keep job tracking in an app-level store/service, not in the upload screen.
- Timers pause in the background; on resume re-poll every tracked job immediately.
- Consider a local notification on completion or failure (not on web today).

---

## 5. List rows: the client-side normalisation you must reproduce

The list API returns raw rows. The web derives several fields in code. Without them AP lists look empty.

For each raw row `process`:
1. `processId = process.workflowInstanceId || process.processId` and `id = processId || process.id`.
2. **Agent data:** `process.agentResponse` is a JSON **string or object**. Parse it. If parsed and non-empty, `_agentResponse = parsed` and `_agentData = [parsed]`.
3. **Request number** (first non-empty): `referenceNumber`, then `REQ-<formEntryId>`, then `REQ-<first 8 chars of processId, uppercased>`, then `requestNo`.
4. **Form values:** `formData` may be a string or object; use `formData.fields || formData`.
5. **Raised:** `raisedAt = createdAtUtc || transactionCreatedAt`; `raisedBy = transactionCreatedByEmail`.
6. **Ignore premature "MATCHED":** if `status`, `decision` or `review` equals `MATCHED` but there is no agent response yet, treat that field as empty.
7. **Processing:** a row is processing when it has `apAgentJobId` (or `jobId`) and (`stageType == "AP_AGENT"` and no decision) where decision = `review` or `agentResponse.decision` or `completedAtUtc`. Then show status "Progressing" and the job's stage/percent.
8. **Can act:** `canMove = !completedAtUtc && (tab is Inbox or Exceptions || the row's activityUserEmail equals the user's email || (stage-based workflow && no activityUserEmail))`.
9. **Actions:** only computed for Inbox, Exceptions, Sent, stage-based or own rows; see section 7.3.
10. **Duplicate flag:** `isDuplicateInvoice` (section 7.1).

### Display fields (supplier, invoice no, amount, PO, due date)
Search in this order. The first non-empty, non-`"-"` value wins. Values can be an object; then read `.value`, `.val` or `["Invoice Value"]`.

| Field | 1. Form values (ids and labels) | 2. `agent["Extracted Invoice JSON"].invoice_header` | 3. Other |
|---|---|---|---|
| Supplier | `UtfgJy6Z0qyfRC5Bclf-c`, `UtfgJy6Z0qyfRC5Bclf_c`, `Supplier Name`, `Vendor Name`, `SupplierName`, `VendorName`, `Supplier`, `Vendor` | `Supplier Name`, `Vendor Name`, `Supplier`, `Vendor` | agent root: `Supplier Name`, `Vendor Name`, `supplier`, `vendor`. Final fallback `row.vendor`, `row.raisedBy`, then "Unknown Supplier". |
| Invoice no | `kvcYuknkDumkTenjvrVLj`, `Invoice Number`, `InvoiceNumber`, `invoice_number`, `Invoice No` | `Invoice Number`, `InvoiceNumber`, `invoice_number` | `row.documentNumber`, `row.requestNo`, then `INV-<id>` |
| Amount | `suyqsm0SYii_8vsj4p0c_`, `WksH1Mrs42X4J9AHgoBtw`, `Invoice Amount`, `Invoice Value`, `Amount`, `Total` | `Invoice Amount`, `Invoice Value`, `Amount`, `Total` | `agent.po_matching["Invoice Value"]` or `.Amount` |
| PO number | `RXwLGHILLrreMmRqlk9mj`, `PO Number`, `PONumber`, `po_number`, `Purchase Order` | `PO Number`, `PONumber`, `po_number` | `agent.po_matching["PO Number"]` / `.po_number`, else `"N/A"` |
| Due date | `792IWMnNXLKyfXjCGcowU`, `kjQFGFMRYBzLnAz9Yrx_c`, `Due Date`, `due_date`, `Due_Date`, `DueDate` | `Due Date`, `DueDate`, `due_date` | `row.dueDate`, `row.due_date`, `agent.payment_terms.due_date`, `agent.po_matching.due_date`. **If still missing:** invoice date + the number of days found in the payment terms. |
| Invoice date | `9F6tPVHoRnmONGx3kYJu2`, `Invoice Date`, `invoice_date`, `invoiceDate` | `Invoice Date`, `invoice_date` | |
| Payment terms | `vxnKCXsXkz8_acPogKe`, `BsPnOsYv6F1fbzWsTpXCW`, `Payment Terms`, `payment_terms`, `Terms`, `terms` | `Payment Terms`, `Terms`, `terms` | `agent.payment_terms.terms` |

Form-value keys are matched exactly first, then again after lower-casing and stripping non-alphanumerics.
The long ids (e.g. `UtfgJy6Z0qyfRC5Bclf-c`) are control ids from the **template form created by the web setup**. They exist only on tenants set up with that template. Label matches are the safer path.

### Amount and date formatting on web
`$` is hardcoded in the list formatter (`$1,234.00`, 2 decimals) while the detail screen prefixes the currency code (default **`CAD`** when none found). Decide a single currency rule for mobile; do not copy the `$`.

---

## 6. Detail data: history and the agent response

`GET .../history` returns an array. For each row:
- If `actionStatus !== 2`: add `{ id: activityId, label: stage, status }` to the **stage stepper**.
- If `agentResponse` is non-empty: add it to `agentData` with `reqNo = requestNo`, `stage = agentType || "No Agent"`.
- If no row had agent data, fall back to the list row's own `agentResponse` (parse if string).

The agent object (first entry of `agentData`) is what drives the Overview. The web screens read these paths. **The backend never sent a schema; these come from reading the code.** Ask for an official sample response and replace this table with it.

| UI element | Path(s) in agent object |
|---|---|
| Header fields | `["Extracted Invoice JSON"].invoice_header` with keys: `Invoice Number`/`Invoice No`/`invoice_number`, `PO Number`/`po_number`, `Supplier Name`/`Vendor Name`/`Supplier`/`Vendor`, `Invoice Amount`/`Total Due`/`Total`, `PO Value`/`PO Amount`, `Currency`/`currency`, `Invoice Date`/`invoice_date`, `Payment Terms`, `confidence`, `<field>_confidence` |
| Line items (first non-empty) | `["Extracted Invoice JSON"].invoice_items`, `.line_items`, `line_items`, `debug["Side-by-side Line Item matching"]` |
| Line fields | description: `Description`/`description`/`Item`/`item`/`name`/`item_no`/`itemNo`; qty: `Quantity`/`quantity`/`Qty`/`qty`; unit price: `Unit Price`/`unit_price`/`Price`/`price`/`rate`/`Rate`; amount: `Amount`/`Line Amount`/`line amount`/`LineAmount`/`total`/`amount`/`line_amount`/`lineAmount`; score: `Line Score`/`score`/`Score`. Values can be objects with `Invoice Value`, `PO Value`, `value` or `val`. |
| Field confidence | `debug["Side-by-side Field Matching"]` = list of `{ Field, Score }`. Field names normalised: vendor/supplier/supplier name → "supplier name"; total due/invoice amount/invoice value/amount/total amount → "total due"; invoice number/no/no. → "invoice number". |
| PO matching | `po_matching.{status, "PO Number", po_number, total, amount, po_amount, total_amount, "Invoice Value", confidence}` |
| Overall confidence | `po_matching.confidence`, else `confidence`, else `score`, else `header.confidence`. Values ≤ 1 are fractions (0.92 → 92%), larger are already percent. |
| Duplicate | `duplicate_check.{status, message}`, `is_duplicate_invoice` |
| Supplier check | `supplier_verification.{status, verified, message}` or `supplier_validation.status` |
| Payment terms | `payment_terms.{terms, payment_terms, status, due_date}` |
| Decision / note | `decision`; AI note: `ai_insight` / `aiInsight` / `reason` |

If `Extracted Invoice JSON` is absent (agent not run or failed), every row is blank. Show an explicit "no data extracted" state.

---

## 7. Business rules in the client (hardcoded logic)

### 7.1 Decision, status and exceptions
`decision` is the first non-empty of: form value `2MH_BMDFEVKsU0uAQjoI1`, `row.review`, `agent.decision`, `row.decision`, `row.status`. Compare in **upper case**.

| Concept | Rule |
|---|---|
| Matched | decision `APPROVED` or `MATCHED`; on detail also `po_matching.status` contains "match" |
| Discrepancy | decision `PARTIALLY APPROVED`, `PARTIALLY MATCHED`, `REJECTED`, `NOT MATCHED`, `NO MATCH`, or `isDuplicateInvoice` |
| Rejected | decision contains `REJECT`, or equals `NO MATCH` / `REJECTED`, or `review` contains `REJECT` |
| Duplicate | `row.isDuplicateInvoice`, or `agent.is_duplicate_invoice`, or `duplicate_check.status` is `DUPLICATE`/`DUPLICATED`, or decision contains `DUPLICATE` |
| No agent data | not processing and no agent payload (also stage text contains "no agent") |
| Overdue | due date earlier than today (compare dates only, not times) |
| Card status text | Overdue → "Overdue" (error); Matched → "Matched" (success); Discrepancy → "Discrepancy" (warning); else decision or stage or "Pending" (accent) |
| Card meta | overdue: "N day(s) overdue"; else "Due <date>"; else "Raised <date>" |

### 7.2 Tabs
For AP the three tabs are hardcoded as keys `Inbox`, `Exceptions`, `Processed`, labelled **Invoices / Exceptions / Processed** (non-AP: Inbox / Sent / Closed → "Inbox / Sent / Completed"). A workflow may override labels with `settings.general.requestTabs[]`.

**Important, easy to get wrong:**
- **Inbox and Exceptions use the same API** (`/Workflows/inbox`). Exceptions is filtered **on the client**: a row is an exception if it is Rejected, Duplicate or has No agent data. The Inbox tab shows everything, exceptions included.
- Exception count is computed from the rows loaded, **not a server count**. With paging it changes as pages load. Ask backend for a server-side exceptions filter **(open question)**.
- **Processed = `/sent` + `/completed` merged.** The same `page` and `pageSize` go to both calls; total = the two totals added. Paging this is lossy; define your own rule.
- Tab counts: Inbox = inbox count, Exceptions = the client count above, Processed = completedCount + sentCount (from `instance-count`). If the workflow is stage-based, counts come from `by-activity/counts` instead.
- Page size on web is 20.

### 7.3 Actions (buttons)
Available actions for a row come from the workflow's `flowJson`, looked up by the row's `activityId` (`rules` array; may be nested as `flowJson.rules` or a JSON string inside `flowJson.flowJson`). The exact rule fields were not read; it returns a list of `{label/name}` buttons **(unverified)**. Ask the backend for a direct "allowed actions" field, or port the web function `getActionsForActivity` (`src/pages/requests/utils/workflow.utils.ts`) as-is.

### 7.4 Quick filters on the AP Inbox tab (client-side)
- `matched` → matched rule above
- `discrepancies` → discrepancy rule above
- `overdue` → overdue rule
- `highValue` → amount ≥ threshold, where threshold = max(1000, 80% of the highest amount in the loaded rows); 10000 if no amounts
- Amount parsing: strip everything except digits, `.` and `-`.

### 7.5 Validation before an action (project rule)
Order is fixed: **form settings first, then workflow/stage settings.** Stop at the first failure and show one message.
1. Form: required fields (skip fields the form or the current stage hides or locks for this user).
2. Stage, in order: required checklist items, required document, user signature, stage mandatory fields.

The stage can lock more fields; a field the stage explicitly lists under "Editable Fields = Custom" stays editable even if the form locks it. Calculated fields and request-number source fields always stay locked.
The web logic is `validateBeforeAction` in `src/pages/requests/components/request/Request.tsx`. For a first mobile release, consider making AP actions comment-only or reject/approve without edits, so no field validation is needed. Decide this early.

---

## 8. Hardcoded value register

| Value | Where it matters | Risk |
|---|---|---|
| `envType = "trial"` | every start call | Sent for all tenants; ask if the backend ignores it. |
| `context = ""` | start call | none |
| Max 5 files / 50 MB | upload | Web policy, not a server-confirmed limit. |
| Poll 5 s (job), 60 s (instance), detail refetch 10 s | tracking | Battery/data on mobile. |
| List page size 20; detail lookups use size 5 | lists | |
| Job stage default "OCR Extraction" | tracking | |
| Message rewrites "Linking related records", "AP Agent finished" | tracking UI | Backend text change breaks it. |
| `stageType == "AP_AGENT"` | processing detection | |
| `showTo: 2` on comments | comments | Meaning unknown. |
| Currency default `CAD`; list `$` | amounts | Wrong for non-CAD/USD tenants. |
| High-value threshold (80% of max, min 1000, default 10000) | quick filter | |
| Control ids: decision `2MH_BMDFEVKsU0uAQjoI1`, invoice date `9F6tPVHoRnmONGx3kYJu2`, terms `vxnKCXsXkz8_acPogKe`, plus supplier/invoice/amount/PO/due ids in section 5 | all display | Only valid for the web setup template form. |
| Tab keys `Inbox`/`Exceptions`/`Processed` | list | |
| AP Agent defaults: approve ≥ 85, partial ≥ 70, field weights Supplier 25 / PO 25 / Currency 5 / Total Due 25 / Line Item 20, features OCR, two-way match, backorder, duplicate | backend config | Not applied by the client; do not hardcode in mobile. Read the result. |
| Sample invoices `inv-1`..`inv-10` | web "try a sample" only | Not needed on mobile. |
| Web `console.log` of payloads | web only | Do not copy. |

---

## 9. Errors and edge cases to handle

1. **Two ids.** `job-<id>` placeholder versus the real `instanceId`. Swap once known, update the open screen and any navigation stack.
2. **Partial multi-file upload.** If file 3 fails, files 1 and 2 already exist. Simplest: upload one file at a time.
3. **Start OK but no id** → error, but the backend may still have created something. Offer a refresh of the list.
4. **File types.** Web accepts almost anything with a MIME type, including zip/rar/eml, which fail later in the job. Limit mobile to PDF, JPG, PNG, TIFF. Convert HEIC to JPG, compress photos above 50 MB.
5. **Job FAILED.** Stop polling and remove the in-progress state. Show the failure text. Provide a retry (a new upload).
6. **Agent finished with no extracted data.** Show the "no data" state, not a row of dashes.
7. **App resumed after a long time.** Re-poll all tracked jobs; refresh lists.
8. **Offline.** Upload cannot be queued by the web logic. Decide whether mobile queues uploads.
9. **Pagination and merged tabs** (section 7.2).
10. **Time zones.** Server times are UTC (`createdAtUtc`, `completedAtUtc`); convert for display.
11. **Strings** on web use a translation library; mobile needs its own approach.

---

## 10. Questions for the backend owner

1. Official response schema for `GET /Workflows/inbox`, `/sent`, `/completed`, `.../history`, and `agentResponse` (section 6 is inferred).
2. Does `envType = "trial"` have any effect? What should production send?
3. Token lifetime and refresh mechanism.
4. Is there a server-side filter or count for exceptions?
5. Which file types and sizes does the AP Agent actually support?
6. Direct "allowed actions" for a request, and the meaning of `showTo`.
7. Is there a push or webhook for job completion, to avoid polling?
8. The `by-activity` response shape and when stage-based tabs apply to AP.
9. Is the `/locate` response suitable for opening one request directly?

---

## 11. Suggested build order and acceptance checks

1. **Auth:** tenants → login → userSession; 401 handling. *Check:* wrong password shows a message; expired token returns to sign-in.
2. **Workflow lookup:** list, load detail, detect `AP_AGENT`. *Check:* a non-AP workflow is not shown the AP upload.
3. **List:** inbox with normalisation (section 5), Invoices / Exceptions / Processed tabs, paging. *Check:* a row shows supplier, invoice no, amount, status; Exceptions only shows rejected/duplicate/no-data rows.
4. **Upload:** pick/camera → start → placeholder row. *Check:* the row appears immediately as "Initiating...".
5. **Job tracker:** poll, swap ids, completed/failed rules, refresh on success. *Check:* kill the app mid-job, reopen, and the job still completes and the row updates.
6. **Detail:** assemble from lists + history; extracted data, line items, confidence, duplicate/supplier check. *Check:* open a matched invoice and a duplicate; both render correctly.
7. **Attachments and comments:** list, preview via the repository file call, add comment.
8. **Actions:** move-next with the payload in 3.7; handle a returned `apAgentJobId`. *Check:* after Approve the row leaves the Inbox tab and appears in Processed.
9. **Polish:** local notifications, offline messages, translations, currency rules.

Smoke data: upload the web sample invoices (`inv-1` clean match, `inv-3` supplier conflict, `inv-7` undercharged, `inv-10` overcharged) to see each decision type. They are in the web repo at `src/assets/Sample Invoices/`.
