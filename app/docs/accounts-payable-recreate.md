# Recreating the Accounts Payable (AP) workflow on another user account

Purpose: a checklist for building a working AP workflow on a fresh account/tenant, and for starting a new AP request on it.
Source of truth: the code in this repo. Items marked **(unverified)** were not confirmed against the backend.

## 0. How the app recognises an AP workflow

- A workflow is AP if its JSON contains a block with `type: "AP_AGENT"` (`isAccountsPayableWorkflow`, `src/pages/requests/utils/workflow.utils.ts`).
- The name is not checked for the request flow. One exception: after onboarding, `RequestsPage.tsx` looks for a published workflow whose name contains `accounts payable` to auto-open the upload page. **Keep the name "Accounts Payable".**
- If the `AP_AGENT` block is removed or renamed, every AP screen (upload, list columns, kanban, filters, history) silently falls back to the generic form flow.

## 1. Prerequisites on the new account

1. User can sign in; the session has `tenantId` and user `id`. Every call below sends header `X-Tenant-Id: <session.tenantId>`, and the workflow Start block gets `{{userId}}` = session user id (the only allowed initiator).
2. Backend is reachable at `VITE_V6_BASE_URL` and `VITE_BASE_URL` (the legacy base URL is used only for the PO template download, `form/downloadExcel/{tenantId}/3`).
3. Decide up front (setup wizard steps 1-3):
   - **Email intake**: none, Gmail or Outlook (needs a connector id).
   - **ERP / PO source**: `PREDEFINED` (demo data), `FILE_BASED_IMPORT` (own PO file + column mapping), `QuickBooks` (connector id).
   - **Storage**: `EZOFIS` (default), Google Drive, OneDrive or GCP (needs a connector id).
4. The AP Agent features (OCR, two-way match, backorder and duplicate detection) must be enabled for the tenant **(unverified)**.

## 2. Easiest path: run the in-app setup wizard

Dashboard -> Accounts Payable -> Setup (4 steps). Step 4 "Review & Complete Setup" runs `handleClose` in
`src/pages/dashboard/workflows/accounts-payable/components/setup/components/steps/step-four/StepFour.tsx`.
It does everything in section 3 in this order and stops on the first error with a toast. **There is no rollback**, so a failure mid-way leaves earlier objects behind (see section 6).

Use section 3 only to reproduce this by hand or to debug a failed setup.

## 3. What setup creates, in order

Template data: `src/pages/dashboard/workflows/accounts-payable/constants/apSetupPayloads.json` (keys `folderPayload`, `formPayload`, `masterFormPayload`, `workflowPayload`).

| # | Step | API | Result needed by the next step |
|---|------|-----|-------------------------------|
| 1 | Create folder (repository) named **"Accounts Payable"**, with the invoice fields: Supplier, Document Type, PO Number, Invoice No, Invoice Date, Invoice Amount, Invoice Tax Amount, Currency, PO Date, PO Amount, Buyer, Terms, Due Date, Supplier/Ship To/Pay To Address, Invoice Extracted Line Item, Matched Status. Custom fields mapped in step 2 of the wizard are added to this payload first. `storageProviderCode` is set from the storage choice. | `POST /repositories` | `folderId` (`repositoryId` / `id` / `folderId`) |
| 2 | Create the **request form**; `{{folderId}}` in the payload is replaced. | `POST /form` | `formId` |
| 3 | Create the **master (PO) form** from `masterFormPayload`. | `POST /form` | `masterFormId` |
| 4 | Upload the PO master file into the master form: the bundled `src/assets/PO Master.xlsx` for demo data, or the user's file with its headers rewritten to the master field names. | `POST /form/uploadMasterFile` (`file`, `formId=masterFormId`, `instanceId=''`, `workflowId=''`) | PO data present |
| 5 | Create the **workflow** from `workflowPayload`, replacing `{{folderId}}`, `{{formId}}`, `{{masterFormId}}`, `{{userId}}`. Then apply `applyMailInitiateConnector` (Start block `mailInitiate`) and `applyApAgentSettings` (AP Agent block). | `POST /workflows` | `workflowId` |
| 6 | Gmail only: register push and link the mailbox (`masterSource: "InternalForm"`, `pollIntervalMinutes: 0`). | `enableGmailPush(connectorId)`, `emailIngestApi.syncMailboxForWorkflow` | Failures here are only logged, not shown to the user. |
| 7 | Create the Document Approval form and workflow. | `createDocumentApprovalFormAndWorkflow()` (`POST /form`, `POST /workflows`) | Shown as a separate workflow. **(unverified, not read in detail)** |
| 8 | Mark setup complete. | `POST /users/{userId}/configuration` with `{ "message": "configuration:completed" }` | Releases the navigation lock. |

### Workflow shape (from `workflowPayload`)

`START` -> `AP_AGENT` -> 5x `INTERNAL_ACTOR` (approval stages) -> `END`, plus a `MASTER` block that points at the master form.

- `START`: `initiateMode: MANUAL`, `initiateBy: ["EMAIL","USER"]`, `users: ["{{userId}}"]`.
- `AP_AGENT.settings.apAgent` defaults:
  - `fieldScore`: Supplier 25, PO Number 25, Currency 5, Total Due 25, Line Item 20.
  - `decisionApprove: 85`, `decisionPartial: 70`, `decisionReject: 0`.
  - `features`: `OCR_AGENT`, `TWO_WAY_MATCH`, `BACKORDER_DETECT`, `DUPLICATE_DETECT`.
  - `resource` and `formId` / `connectorId` are overwritten by `applyApAgentSettings`.

### `applyApAgentSettings` rules

| ERP choice | `resource` | `formId` | `connectorId` |
|---|---|---|---|
| QuickBooks | `QUICKBOOKS` | `""` | chosen connector id |
| PREDEFINED / FILE_BASED_IMPORT / wantsFileBasedImport | `FORM` | `masterFormId` | `""` |
| Any other ERP (e.g. SAP, NetSuite) | left at template default (`FORM` + `{{masterFormId}}`) | | |

The last row means a non-QuickBooks, non-file ERP currently gets the template default, not an ERP connection. SAP detection exists in `isSapPoSourceConfigured` but setup does not write SAP settings.

## 4. Hardcoded values to be aware of

| Value | Location |
|---|---|
| `envType: 'trial'`, `context: ''` sent on every start | `newrequest/FileUpload.tsx` ~L592 |
| Max 5 files per batch, 50 MB per file | `FileUpload.tsx` ~L772, `newrequest/utils.ts` |
| Hardcoded field-score control ids inside the AP Agent block (`U6lnVq...`, `HQ2ebS...`, ...) | `apSetupPayloads.json` ~L28391 |
| Workflow name "Accounts Payable" (used to auto-open upload after setup) | `RequestsPage.tsx` L68-72 |
| Request-number fallback `REQ-<first 8 chars of processId>` | `FileUpload.tsx` ~L716 |
| Poll intervals: 5 s (AP job), 60 s (instance) | `ProcessingBackgroundManager.tsx` |
| Message rewrite "Linking related records" -> "Linking PO Records"; match on "AP Agent finished" | `api/v6/workflows.ts` L641, `resolveApAgentJobMessage.ts` |
| PO master screen shows `hasExistingMasterData = true`, count `512` (placeholder, TODO) | `poFlow/PoSetupFlowPage.tsx` L100-104 |
| Sample invoices inv-1..inv-10 | `src/assets/Sample Invoices/` |

## 5. Starting a new AP request on the new account

1. Open the Accounts Payable workflow -> **+ New** (always enabled for AP). The page opens `FileUpload` (invoice upload) only once the workflow has finished loading and `isAccountsPayable` is true.
2. Upload an invoice (or pick a sample). Per file:
   - `POST /Workflows/{workflowId}/start`, multipart: `file`, `context=''`, `envType='trial'`, header `X-Tenant-Id`.
   - Response is read as `instanceId`, `startPayload.transactionId`, `apAgentJobId`. If neither `instanceId` nor `apAgentJobId` is returned, the UI throws.
   - If `instanceId` and `transactionId` both came back: `GET /Workflows/inbox` (page 1, size 10) for request number and stage.
3. Background tracking:
   - With `apAgentJobId`: `GET /Workflows/ap-agent/jobs/{id}` every 5 s. The stub id is `job-<id>` until the response carries `instanceId`.
   - On success: one fetch each of `GET /Workflows/inbox`, `/sent`, `/completed`, then list refresh.
   - Without a job id: poll `/Workflows/sent`, falling back to `/Workflows/inbox`, every 60 s.
4. Updating PO master data later: the PO sheet (`openNewRequest('po')`) -> `POST /form/uploadMasterFile` with `formId` = `workflowJson.blocks[AP_AGENT].settings.apAgent.formId` (falls back to the workflow's form id) and `workflowId`. `importStrategy` (replace / append / override) is sent, but the backend contract for it is still a TODO.

## 6. Things to check on the new account (known risks)

- [ ] **Partial setup.** If setup fails after folder/forms are created, delete those objects (or reuse them) before retrying, otherwise you get duplicate "Accounts Payable" folders and forms. Setup has no rollback and no idempotency check.
- [ ] **Navigation lock.** While setup is incomplete, `_app/route.tsx` forces everything to `/`. Step 8 (configuration completed) must succeed to release it.
- [ ] **Master form id.** Confirm `apAgent.formId` in the saved workflow equals the master form you uploaded the PO file into. A wrong or empty `formId` means no PO matches.
- [ ] **String vs object `workflowJson`.** `FileUpload` parses a string `workflowJson`; `PoSetupFlowPage` reads `.workflowJson.blocks` directly. If the API returns a string, the PO upload goes with an empty `formId`.
- [ ] **File types.** `isSupportedDocument` accepts anything with a MIME type and the input offers zip/rar/eml, so unsupported files reach the backend job and fail there.
- [ ] **`envType: 'trial'`** is sent for every tenant. Confirm the backend ignores it for paid tenants.
- [ ] **Multi-file upload.** Files are started one by one; a failure on file N leaves files 1..N-1 already created, and only the last one is opened.
- [ ] **Keep the `AP_AGENT` block** in the workflow if you edit it in the builder.
- [ ] **Connectors.** Gmail/Outlook, QuickBooks and non-default storage each need a connected account on the new user before setup, or the wizard cannot supply a `connectorId`.
- [ ] **Debug logging.** `FileUpload` and `PoSetupFlowPage` print workflow JSON and response payloads to the console in all builds.

## 7. Smoke test after setup

1. Workflows list shows "Accounts Payable" (and Document Approval) as published.
2. Open the workflow's JSON: `START.users` contains the new user id; `AP_AGENT.settings.apAgent.formId` equals the master form id; no `{{...}}` placeholders remain.
3. Master form has PO rows (demo file or the imported file).
4. Upload `inv-1` (the "PO Verified" sample). Expect a job id, then stages through OCR -> matching -> "Linking PO Records", then a decision (Approve at score >= 85).
5. Upload `inv-3` / `inv-7` (supplier conflict, undercharged) and confirm they land in an exception/partial state.
6. Refresh the inbox and confirm the request has a real request number (not just `REQ-xxxxxxxx`).
