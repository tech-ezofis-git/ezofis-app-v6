# Accounts Payable: mobile app hand-off

Audience: the developer building the AP flow in the mobile app (Capacitor build, `src/pages/mobile/**`).
Everything here comes from reading the web code. Items marked **(unverified)** need confirming with the backend owner.

## 1. What mobile already has, and what it lacks

| Feature | Mobile status | Where |
|---|---|---|
| Sign in / sign up | Done | `pages/mobile/features/auth/*` |
| AP request list (tabs, quick filters, field filters, infinite scroll) | Done | `features/requests/useMobileRequestsInbox.ts` |
| Request detail (extracted data, line items, attachments, comments, history) | Done, **read-only** apart from adding a comment | `features/invoice-detail/*` |
| **Upload invoice / start a request** | **Missing** | web: `requests/components/request/components/newrequest/FileUpload.tsx` |
| **Job progress tracking after upload** | **Missing** | web: `ProcessingBackgroundManager.tsx` |
| **Approve / Reject / Forward** | **Missing**. The footer button "Verify invoice" only refetches and shows a toast. | web: `Request.tsx` ~L2560 |
| PO master upload | Not needed on mobile unless you decide so | web: `poFlow/PoSetupFlowPage.tsx` |
| AP setup wizard | Not on mobile; setup must be done on web first | `dashboard/workflows/accounts-payable/*` |

Mobile reuses the web hooks and store (`useRequestDetail`, `requestStore`, `workflowsApiV6`). Anything you change in those affects both apps.

## 2. How the app knows it is AP

- A workflow is AP if its JSON has a block with `type === 'AP_AGENT'` (`isAccountsPayableWorkflow`, `requests/utils/workflow.utils.ts`).
- For AP the list tabs are hardcoded as buckets `Inbox`, `Exceptions`, `Processed`, labelled "Invoices", "Exceptions", "Processed". For other workflows they are `Inbox`, `Sent`, `Closed`. A workflow can override labels with `settings.general.requestTabs`.
- AP shows five quick-filter chips (due date, matched, discrepancies, high value, ...). They are only applied on the `Inbox` tab.
- Mobile falls back to the workflow name "Accounts Payable" when none is loaded (`useMobileRequestsInbox.ts`, last lines).

## 3. Starting a request: no form, upload only

For AP there is no form to fill. The user picks a file and the app calls the API immediately.

### 3.1 The call
`POST /Workflows/{workflowId}/start` (`workflowsApiV6.startWorkflow`)
- Headers: `X-Tenant-Id: <session.tenantId>`, `Content-Type: multipart/form-data`, `accept: text/plain`, plus the bearer token.
- Body (FormData):
  - `file`: the invoice
  - `context`: `''` (hardcoded)
  - `envType`: `'trial'` (hardcoded, even for paid tenants; confirm with backend)
- Success is HTTP 200 or 201. Response fields used: `instanceId`, `startPayload.transactionId`, `apAgentJobId`.
- If neither `instanceId` nor `apAgentJobId` is present, treat it as a failure.

### 3.2 Hardcoded limits on web (copy or deliberately change)
- Max **5 files** per batch (extra files are dropped with a warning).
- Max **50 MB** per file.
- File-type check is loose: anything with a MIME type passes. The picker offers pdf, office files, images, zip, rar, 7z and eml. The agent is built for invoices (PDF/images); other types will fail later in the job, not at upload. Recommend restricting mobile to PDF, PNG, JPG, TIFF (camera and photo library).
- Files are started **one after another**, not in parallel. If file 3 fails, files 1 and 2 already exist.

### 3.3 What web does right after the call (replicate these)
1. Build a local "stub" request so the user sees it immediately: id = `instanceId` or `job-<apAgentJobId>`, `stageType: 'AP_AGENT'`, `isProcessing: true`, stage `Initiating...` (job) or `Start`, placeholder texts "Analyzing Invoice..." and "Analyzing Supplier...".
2. If `instanceId` and `transactionId` both came back, `GET /Workflows/inbox?workflowId&pageNumber=1&pageSize=10&instanceId&transactionId` once, to get the real request number. Request number order: `referenceNumber`, then `REQ-<formEntryId>`, then `REQ-<first 8 chars of processId, upper-case>`.
3. Register the job for tracking (section 4).
4. Open the detail screen for the last file, and refresh the list.

## 4. Checking the file status

### 4.1 The status call
`GET /Workflows/ap-agent/jobs/{apAgentJobId}` (`workflowsApiV6.getApAgentJobStatus`), polled **every 5 seconds**. Only call it when you have an `apAgentJobId`.

Fields the web reads:

| Field | Meaning |
|---|---|
| `stage` | Current step. `COMPLETED` or `FAILED` are terminal. Default shown if missing: `OCR Extraction`. |
| `percent` / `Percent` | Progress number (both casings occur). |
| `message` | Text to show. |
| `hangfireStatus` | `Succeeded` or `Failed` for the background job. |
| `isTerminal` | True when finished. |
| `instanceId` | Appears once the real request exists. |
| `errorMessage` | Used on failure text. |

Rules (copy exactly or statuses will disagree with web):
- **Completed** = `isTerminal` OR `stage === 'COMPLETED'` OR `hangfireStatus === 'Succeeded'`.
- **Failed** = `hangfireStatus` is `failed` (case-insensitive) OR `stage === 'FAILED'`. Stop polling and remove the in-progress state. Failure text is built from `message`, `errorMessage` and `stage`.
- Message rewrites: `Linking related records` becomes **Linking PO Records**; `AP Agent finished` is shown as empty text.
- When `instanceId` first appears, replace the placeholder id `job-<id>` with it everywhere (list row, open detail, store mappings). Do not use `job-<id>` for comments, links or sharing.
- On completion do this once per job: `GET /Workflows/inbox`, `/Workflows/sent`, `/Workflows/completed` with `instanceId` (page 1, size 5), then refresh lists and the detail query. Remember that the job was handled so you do not poll again.
- Do not call `useRequestDetail` while the id starts with `job-`: it is disabled for those.

### 4.2 Without a job id
If the start response had only `instanceId`, poll `GET /Workflows/sent` (fall back to `/Workflows/inbox`) every **60 seconds** filtered by `instanceId` and `transactionId`. The request is "done processing" when `stageType !== 'AP_AGENT'`, or it has a decision (`review`, `agentResponse.decision`, `completedAtUtc`), or the stage is `Verifier`, `Approved` or `Completed`.

### 4.3 Mobile specifics to decide
- Polling must survive screen changes: keep it in a global store or provider, not in the upload screen (web uses `ProcessingBackgroundManager`, mounted once).
- Backgrounded app: JS timers pause. On resume, re-poll every tracked job immediately.
- Consider a push or local notification when a job completes or fails. Nothing exists for this today.

## 5. The detail "Overview" is hardcoded to the agent's output shape

Detail data comes from `useRequestDetail(workflowId, processId, transactionId)`:
1. `GET /Workflows/inbox`, `/sent`, `/completed` (page 1, size 5, filtered by `instanceId`), then pick the matching row. If a transaction id was opened, that exact row wins, otherwise the newest live row.
2. Form definition via `requestApi.getForm(formId)`.
3. `GET /workflows/{workflowId}/instances/{instanceId}/history`. Rows with an `agentResponse` become `_agentData`; rows with `actionStatus !== 2` become the stage stepper.
4. Fallback: `agentResponse` on the row itself (a JSON string or object).
5. `_actions` come from the workflow `flowJson` rules for the current `activityId` (`getActionsForActivity`). These are the buttons that may be shown (Approve / Reject / Forward, ...). Use them; do not hardcode the buttons.

It refetches every 10 s while the stage is an agent stage with no decision yet.

### 5.1 Agent JSON paths the mobile detail screen reads (`useMobileRequestDetail.ts`)
These are hardcoded key names; if the backend renames one, the field goes blank.

- Header: `agent['Extracted Invoice JSON'].invoice_header` with keys `Invoice Number`, `Invoice No`, `invoice_number`, `PO Number`, `po_number`, `Supplier Name`, `Vendor Name`, `Supplier`, `Vendor`, `Invoice Amount`, `Total Due`, `Total`, `PO Value`, `PO Amount`, `Currency`, `currency`, `Invoice Date`, `invoice_date`, `Payment Terms`, `confidence`, and `<field>_confidence`.
- Line items, first non-empty of: `Extracted Invoice JSON.invoice_items`, `...line_items`, `agent.line_items`, `agent.debug['Side-by-side Line Item matching']`. Per line keys: `Description`/`description`/`Item`/`item`/`name`/`item_no`; `Quantity`/`quantity`/`Qty`/`qty`; `Unit Price`/`unit_price`/`Price`/`price`/`rate`; `Amount`/`Line Amount`/`total`/`line_amount`; score `Line Score`/`score`/`Score`. Values may be objects with `Invoice Value`, `PO Value`, `value` or `val`.
- Per-field confidence: `agent.debug['Side-by-side Field Matching']`, entries with `Field` and `Score`. Names are normalised: vendor/supplier become "supplier name"; total due/invoice amount/invoice value/amount/total amount become "total due"; invoice number/no/no. become "invoice number".
- Match: `agent.po_matching` (`status` containing "match", `PO Number`, `po_number`, `total`/`amount`/`po_amount`/`total_amount`, `Invoice Value`, `confidence`).
- Duplicate: `agent.duplicate_check.status` (`DUPLICATE` or `DUPLICATED`), `agent.is_duplicate_invoice`, row `isDuplicateInvoice`, message `agent.duplicate_check.message`.
- Supplier check: `agent.supplier_verification` or `agent.supplier_validation` (`status`, `verified`, `message`).
- Payment terms: `agent.payment_terms.terms` / `.payment_terms` / `.status`.
- Decision: `agent.decision`; AI note: `agent.ai_insight` / `aiInsight` / `reason`.
- Confidence: `po_matching.confidence`, `agent.confidence`, `agent.score`, `header.confidence`.

### 5.2 Hardcoded values in that screen
- **Currency defaults to `CAD`** when none is found.
- Hardcoded **form control ids** (they are specific to the template form created at setup, so they work only on forms created from `apSetupPayloads.json`):
  - `2MH_BMDFEVKsU0uAQjoI1`: decision control (read first in `getItemDecision`)
  - `9F6tPVHoRnmONGx3kYJu2`: Invoice Date
  - `vxnKCXsXkz8_acPogKe`: Payment Terms
- "Matched" = decision `APPROVED` or `MATCHED`, or `po_matching.status` contains "match".
- Rejected = decision contains `REJECT`, or equals `NO MATCH`.
- Status label order: Overdue, then Matched, then decision, then stage, then "Pending". Tones: error, success, warning, accent.
- Payment badge: "Overdue" or "in due"; day count from `extractDueDate`.
- Placeholder strings: "Unknown Supplier", "Line item", "No duplicates detected", "Not verified", "Supplier verified".
- The "Verify invoice" button only refetches; "Supplier verify" only shows a toast. Neither calls the backend.
- Web fallback: `Request.tsx` L320 seeds field labels (PO Number, Invoice No, ...) from `apSetupPayloads.formPayload` if the workflow form is still loading.

### 5.3 Web decision thresholds (configured in the AP Agent block, not in the client)
Approve score ≥ 85, partial ≥ 70, reject 0. Field weights: Supplier 25, PO Number 25, Currency 5, Total Due 25, Line Item 20. The client only displays the result.

## 6. Actions on a request (not built on mobile)

`POST /Workflows/instances/{instanceId}/move-next` (`workflowsApiV6.moveNext`). Body is a **JSON string**:

```
activityid, activityUserId, AIAGENTHtml, AIAGENTResponse (string), comments,
formData (JSON string of field values), formEntryId (number), formId,
instanceId, isItemTable: true, itemId, processId, repositoryId,
review: "<action name>", transactionId, workflowId
```
- `review` is the action label from `_actions` (Approve, Reject, Forward, ...).
- `Forward` adds `assignToUserId` and `internalForwardUserId: [userId]`. On web these are passed through `window._selectedForwardUserId`; mobile should pass them as parameters instead.
- `isItemTable: true` is hardcoded. `formEntryId` falls back to `0`.
- The response may return a new `apAgentJobId`; if so, register it and track as in section 4.
- **Validation before any action** (project rule): form-level required fields first, then stage rules (checklist, required document, signature, mandatory fields), stop at the first failure, show one toast. Logic is in `validateBeforeAction` in `Request.tsx`. If mobile adds Approve/Reject it must reuse that order; extract it into a shared util instead of copying.

## 7. Supporting calls the detail screen already uses

| Purpose | Call |
|---|---|
| Attachments list | `GET /workflows/{workflowId}/instances/{instanceId}/attachments` |
| Attachment preview | `fileApi.viewBinaryV6(repoId, itemId)` (binary); base64 variant exists for the older API. Hook: `useAttachmentPreviewUrl.ts`. Needs `repositoryId` + `itemId`. |
| Comments list / add | `GET`/`POST /workflows/{workflowId}/instances/{instanceId}/comments`; mobile sends `{ comments: text, showTo: 2 }` (`showTo: 2` is hardcoded) |
| History | `GET /workflows/{workflowId}/instances/{instanceId}/history` |
| Workflow list | `workflowsApiV6.getWorkflows()` then `getWorkflowById` and `getInstanceCount` |
| Filter fields | `GET /workflows/{workflowId}/filter-fields` |
| Stage tab counts | `workflowsApiV6.getWorkflowsByActivityCounts` (only for stage-based tabs) |
| Locate one request by id | `GET /Workflows/{workflowId}/instances/{instanceId}/locate` (useful for deep links from notifications) |

All V6 calls send `X-Tenant-Id` from the session, plus the bearer token (`authUserStore.identity.accessToken`). A `401` resets the session and redirects to `/sign-in`.

## 8. Things to watch out for on mobile

1. **Setup is web-only.** The AP workflow, forms, master PO data and storage must exist first (see `accounts-payable-recreate.md`). A fresh account without them shows an empty list.
2. **Two ids.** `job-<id>` (placeholder) versus the real `instanceId`. Handle the swap or the opened detail will 404 or poll forever.
3. **`envType: 'trial'`** is sent on every start. Confirm with the backend before shipping.
4. **Camera or gallery files.** Phone photos can exceed 50 MB; HEIC is not in the accepted list. Convert to JPG/PNG or PDF before upload.
5. **Multi-file upload** leaves partial results if one fails. Decide whether mobile uploads one file at a time (simplest).
6. **Polling cost.** 5 s per job plus 10 s detail refetch. Cap concurrent tracked jobs and pause when the app is in the background.
7. **Agent key names are matched by string.** There is no typed contract. Ask the backend for the agent response schema and put it in one mapper instead of the many `pick(...)` fallbacks.
8. **Locale.** Web strings use Lingui; mobile strings are plain English literals (e.g. "Verify invoice", "Overdue"). Decide whether to translate.
9. **Debug logging.** `console.log` of payloads exists on the web upload path (workflow JSON, response, MoveNext payload). Do not copy it to mobile builds.
10. **Duplicate and missing-data states.** When the agent finishes without `Extracted Invoice JSON`, all rows show "-". Show an explicit "no data extracted" state.

## 9. Suggested build order

1. Upload screen: file picker or camera, single file, call `startWorkflow`, show a processing row.
2. Global job tracker: poll `ap-agent/jobs/{id}`, apply the completed/failed rules and the `job-` to `instanceId` swap, refresh lists on completion.
3. Show a processing and a failed state on list cards and the detail screen.
4. Wire actions from `_actions` to `moveNext`, behind the shared validation util.
5. Replace the placeholder "Verify invoice" and "Supplier verify" buttons or remove them.
6. Add notifications on completion and failure (needs a decision on push versus local).
