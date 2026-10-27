# EZOFIS Mobile — Workflow API integration (v0.4.4, 27 Oct 2026)

Source: WORKFLOW_API_FULL_REFERENCE_1 (26 Oct 2026, 8 pages; adds §5.7 file view and §9 start details). Response shapes were checked read-only against cloud.ezofis.com on 26 Oct 2026. Form-behaviour calls were taken from the cloud.ezofis.com web client. No live writes were made; write calls were tested against mocks only.

## Wired (live when signed in; "Explore" keeps sample data)
- **Profile:** GET /api/usersession. Live keys differ from the doc: `MFAuthentication`, `MFA Methods`, `Job Title`, `LoginType`.
- **Home and the "My Requests" inbox:** GET /Workflows/inbox/all-workflows?itemsPerWorkflow=20.
- **Sent and Completed totals:** GET /Workflows/counts (summary table, lags).
- **Per-workflow lists:** GET /Workflows/{inbox|sent|completed}. **Per-workflow counts:** GET /Workflows/instance-count?workflowId.
- **Ticket detail:** locate, instance, history, comments and attachments, loaded together.
- **Labels and forms:** GET /Workflows/{id} plus GET /form/{formId}.
- **Action buttons:** workflowJson.rules from the row's activityId. **move-next:** { activityid, review, comments, formData? }.
- **Comments and attachments:** POST.
- **File view (§5.7):** GET /api/repositories/{repositoryId}/items/{itemId}/file?disposition=inline. Opens from the attachments tab, the source document, file cells in form tables and the file chip on list cards. In-app viewers for PDF, images, e-mail (.eml/.msg), Word, Excel and PowerPoint.
- **Line items:** from agentResponse (PO matching or extracted lines) or repositoryItem.fields.InvoiceExtractedLineItem.
- **New request (§9) — same behaviour as the web form (`src/formEngine.js`):**
  - **Who can start:** only Active workflows whose START block includes the user; a 403 is shown otherwise.
  - **Defaults:** `defaultValueType` / `defaultValueInSelectField` / `fillValueType` (USER_EMAIL, USER_NAME, LOGIN_NAME, CURRENT_DATE, CURRENT_YEAR, AUTO_GENERATE, custom). Custom option lists apply only to choice controls; text fields carry a leftover "Option 1,Option 2,Option 3" that is ignored.
  - **Master-data dropdowns:** GET /form/{masterFormId}/entry/all?currentPage=1&itemsPerPage=5000&includeFormJson=true returns { entries, meta }; rows are keyed by column id. Rows are filtered by `masterFormConditionColumn` and the parent chain (`masterFormParentColumn` / `parentFieldId`); a single match is preselected.
  - **Auto-fill:** `fillValueType: MASTER` takes the value from the parent's matching master row (e.g. Phone and Position from Email; Code from Paid Via; Budget from Email).
  - **Table cascades:** `lookupSettings.cascadeFromColumn` (Category → Expense For → GL Number, starting from GL-Type).
  - **Calculations:** `formulaTokens` FIELD / OPERATOR / TABLE_SUM ("tableId::columnId").
  - **Conditional required:** `validation.mandatorySettings` [{ controls, value }].
  - **OCR on file controls** with `validation.assignOtherControls`:
    - POST /uploadAndIndex/uploadForOcr (multipart: file, repositoryId, fields = ["Label,TYPE", …]) returns { ocrFieldList: [{ name: "Label,TYPE", value }], ocrJson } and fills the assigned controls.
    - On submit, POST /uploadAndIndex/uploadWithOcr (file, repositoryId, filename, fields, ocrJson) returns { fileId, repositoryId }.
    - The file cell becomes { fileId, fileName, itemId, repositoryId } and is listed in stagedFiles.
  - **Start:** POST /Workflows/{id}/start/json { context: "", envType: "live", formData keyed by id, stagedFiles }. When extra attachments are added, multipart /start (file, formData, fileIds) is used instead. The optional comment is posted to the new ticket.
- **Hidden everywhere:** OCR text and tenant / instance / storage / repository IDs.

## v0.4.3 — workflow tabs and button colours
- **Per-workflow tabs** come from `workflowJson.settings.general.requestTabs` [{ id, label, nodeIds }], the same way the web inbox builds them:
  - A tab with nodeIds lists POST /workflows/by-activity { workflowId, activityIds, pageNumber, pageSize }. Its count comes from POST /Workflows/by-activity/counts { workflowId, activityIds }, summed over the tab's nodes.
  - A tab without nodeIds maps by position to Inbox / Sent / Completed.
  - With no requestTabs, the defaults are Inbox / Sent / Completed, or Invoices / Exceptions / Processed when the workflow has an AP_AGENT block.
  - The open tab's badge always shows the list's own totalCount, because the count endpoints can disagree with the list.
- **Action buttons:** label = rule `proceedAction`, colour = rule `buttonColor`. Named colours (red, green, blue, orange…) and hex values are both accepted. The confirm button uses the same colour.

## v0.4.4 — auto-refresh and phone notifications
- **Polling:** GET /Workflows/inbox/all-workflows?itemsPerWorkflow=10. It runs every 45 s while the app is open, every 2 min in the background, and immediately on resume or reconnect. A request counts as new when its (instanceId, transactionId) wasn't in the previous poll.
- **When something is new:** the inbox badge updates, the request appears in the in-app notification list, a phone notification is posted when the app isn't on screen, and Home / Inbox refresh. Forms and open tickets are never reset.
- **Phone notifications:** Capacitor LocalNotifications in the release build; a native prompt bridge in the test APK; the Web Notification API in browsers.
- **Backend needed for notifications when the app is closed:** a device-token registration endpoint plus an FCM/APNs push when an inbox item is created. Without these, notifications only appear while the app process is alive.

## v0.4.5 — Ask EZOFIS AI (Repository Assistant chatbot)
Source: REPOSITORY_CHATBOT_API_FRONTEND (Oct 2026). Client: `src/assistant.js`. Screen: `src/screens/AskAiChat.jsx` (`/app/ask`).
- **Call:** POST /api/repositories/assistant/chatbot `{ message, sessionId, specificId? }` with Bearer + X-Tenant-Id. `actionFrom` and `token` are left out (the server defaults to "Repository" and forwards the Authorization header). Timeout 125 s, because the server waits up to 120 s.
- **Session:** `sessionId = "mobile-<uuid>"`, created when the chat opens, kept for every message, and replaced on "New chat" or an organization switch.
- **Response:** the agent's `chatbot_result`. The app renders `text.blocks`:
  - `paragraph` (with `**bold**` and line breaks, shown as text, never HTML);
  - `bullets` (e.g. Filters Applied, shown as tags);
  - `card` / `cards` (result cards; first 4, then "Show more");
  - `repo_picker` (tapping a repository asks the same question again with `specificId`).
  With no blocks, it falls back to `hits`, then `reply` / `conversation`.
- **Result cards:**
  - `id.itemId` + `id.repositoryId` → "Open file" in the in-app viewer (§5.7 file + item metadata);
  - `id.workflowId` + `id.instanceId` → "View request" (ticket detail);
  - anything else → "Open on the web".
  - Raw form JSON in ticket descriptions is hidden.
- **Errors:** 400 → the server's message; 502/503/504 → "Ask AI is unavailable right now"; timeout → a hint to ask a shorter question. Each error has "Try again".
- **Not wired:** global search (`/assistant/search`); confirming agent actions (`pending_action`) — the app points to cloud.ezofis.com.

## ⚠️ Security finding (for backend)
- The "Users" master form (bb32d502…) returns a **plain-text Password column** in /form/{id}/entry/all to any user who can read it. The app keeps only the columns a form references, but the column should be removed or excluded server-side.

## Open items
- Polling apAgentJobStatusUrl / job progress after start (not yet shown in the app).
- Folder API: Folders are still sample data. Notifications API: none yet.
- Server returned intermittent 500s and timeouts on GET /Workflows/{id} during checks.
