# Sub-Workflow in V6 — Analysis & Phase Plan

Source: `D:\V5, Mar 25, 2027\V5_SUBWORKFLOW_REPORT.md` (V5 extraction), compared against this repo on `dev-raja`.

## 1. What V5 actually has

V5 does not have one "sub-workflow" feature. It has **two mechanisms**, and both store `subWorkflowId`:

|                       | A. Workflow Initiator (manual)                                     | B. Workflow Connector block (automatic)                    |
| --------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| Where it's configured | a checkbox + workflow picker on a START / INTERNAL_ACTOR block     | its own block type, `WORKFLOW_CONNECTOR`                   |
| Who creates the child | the user, using an "Initiate - &lt;name&gt;" button on the request | the backend engine                                         |
| Frontend work         | a lot: button, child form, pre-fill, link, list, history           | the builder picker, plus a `[CONNECTOR]` marker in history |
| Field mapping         | implicit: fields with the same label, copied once                  | not in the frontend                                        |

V5 has **no** settings for wait/async, triggers, per-row spawning, result branching or explicit field mapping.

## 2. What V6 already has

| Piece                                                                 | Status                                           | Where                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- |
| `GET /workflow/subWorkflow/{wId}/{pId}`                               | wrapper exists, unused, untyped                  | `src/api/requests/requests.ts:514`                       |
| `POST /workflow/postSubWorkflow`                                      | wrapper exists, unused (expects 201)             | `src/api/requests/requests.ts:530`                       |
| `PUT /workflow/putSubWorkflow/...`                                    | wrapper exists, unused (also unused in V5)       | `src/api/requests/requests.ts:544`                       |
| `GET workflow/getDetailsforMainworkflow/{wId}/{pId}` (child → parent) | wrapper exists (`getMainProcessDetails`), unused | `src/api/requests/requests.ts:727`                       |
| `POST /workflow/all` (picker source)                                  | exists                                           | `src/api/workflow/workflow.ts` `getAllWorkflows`         |
| `POST /workflow/transaction` (create child)                           | exists                                           | `src/api/workflow/workflow.ts`, `useWorkflowForm.submit` |
| `PUT /transaction/updateSubWorkflow/{wId}/{tenantId}/{swId}`          | **missing**                                      | —                                                        |
| `POST /report/workflowAuditWithSlaFields/{id}` (child display data)   | **missing**; V6 has no `/report/` calls          | —                                                        |
| `subWorkflowHistory` on history rows                                  | the type field exists, nothing renders it        | `src/pages/requests/hooks/useHistory.ts:25`              |
| Builder node for connector / initiator toggle                         | **missing**                                      | `src/pages/workflows/**`                                 |
| Request-sheet Sub Process tab / Initiate button                       | **missing**                                      | `src/pages/requests/components/request/**`               |

V6 builder model: React Flow nodes keyed by `data.toolType` (`utils/nodeToolTypes.ts`). These are converted to and from V5-style `blocks[]` by `utils/exportWorkflow.ts` (`mapToolTypeToLegacyType`) and `utils/importWorkflow.ts`. The first node becomes `START`, and Manual User nodes become `INTERNAL_ACTOR`.

V6 request sheet: right-side panels switch with `rightView: 'overview' | 'history' | 'attachments' | 'comments'`. The tabs are in `Header.tsx` (~line 930), and the panels render in `GenericRequestOverview.tsx` (~line 1738). A new `'subProcess'` view fits this pattern. That also follows the code-style rule (no drawers or modals, use inline panels).

## 3. Decisions taken by default (change them if you disagree)

1. **Build mechanism A end to end.** Build B's builder side only (node, picker, save/load), because B's runtime is done by the backend.
2. **Fix V5 bugs, don't copy them.** Reset `workflowInitiator` when the box is unchecked. Make the picker required while the box is on. Leave the workflow being edited out of the picker (no self-loop).
3. **Initiate-button permission:** the same rules as V5 (child START is `MANUAL`, `initiatedBy !== 'DOCUMENT'`, user is in `users` or `"0"`, or the e-mail domain matches). Group-based access is a possible improvement; not done unless you ask.
4. **The child form reuses the existing `WorkflowRequest` / `useWorkflowForm`.** We won't copy V5's 7.6k-line `SubWorkflow.vue`.
5. **One-time pre-fill by matching labels** (tables match columns by label), the same as V5. It lives in a pure util with vitest tests.
6. **UI first, API later.** The V6 sub-workflow API isn't ready, so:
   - **Settings live in the workflow JSON.** The connector target and initiator toggle are written into each block's `settings` in flowJson (`subWorkflowId`, `workflowInitiator`), exactly as V5 does, so saving a workflow already persists them.
   - **Runtime data comes from a local JSON mock** (`src/features/sub-workflow/api/mock/subWorkflowMock.json`, plus localStorage for links created in the UI). It's on by default; set `VITE_SUB_WORKFLOW_API=live` to switch to the real endpoints once they exist. All UI talks to `subWorkflowApi` / the hooks, never to the mock directly.

## 3a. Localhost-only switch (temporary)

Until the API is ready, all sub-workflow UI is shown only on a local dev host. `isSubWorkflowEnabled()` (`src/features/sub-workflow/featureFlag.ts`) is true for `localhost`, `127.0.0.1`, `[::1]` and `*.localhost`, and false everywhere else (e.g. `https://cloud.ezofis.com`). Gated places:

- Builder: the "Workflow Connector" palette entry (`AddNodeMenu.tsx`), the connector settings panel (`PropertiesPanel.tsx`), the Manual User "Sub Workflow" section (`ManualUserSettingsPanel.tsx`), the connector/initiator publish checks (`BuilderHeader.tsx`), and writing initiator keys on export (`exportWorkflow.ts`), so workflows saved on cloud stay exactly as before.
- Requests: the "Initiate - &lt;child&gt;" button, the Sub Process tab and its queries, and the parent link (`Request.tsx`); the Initiate button on new requests (`WorkflowRequest.tsx`).

Import still reads the keys (it changes nothing that's saved).

**Connector save block:** the save failure reported on 2026-10-27 came from `SubWorkflowId` being `int?` in `WorkflowJsonDto.cs`, so any GUID target failed, on Initiator blocks too. That's fixed. The API can now store a `WORKFLOW_CONNECTOR` block, but the engine can't run it: it would become a manual step nobody can act on. So the builder still refuses to save a workflow containing a Connector step until `CONNECTOR_ENGINE_READY` (`utils/workflowConnector.ts`) is true, whatever `VITE_SUB_WORKFLOW_API` says. It shows an error toast and sends nothing (`getConnectorSaveBlock`, called from `BuilderHeader.tsx`), and the Connector panel tells the user it's preview-only. **To go live:** delete `featureFlag.ts` and every `isSubWorkflowEnabled()` check (grep for it), and drop the `location` stubs in the two test files.

**Live API (`VITE_SUB_WORKFLOW_API=live`):** the link endpoints exist (see §4a) and the web app uses them for Initiate, the Sub Process tab and the parent link. Inbox chips and connector history stay empty in live mode until the list and history responses carry that data.

## 4. Questions for the backend (Phase 0, runs alongside the other phases)

1. Is `WORKFLOW_CONNECTOR` executed by the V6 engine? When does it fire, does the parent wait, what is copied, and what happens on reject or force-close? → blocks the runtime side of B.
2. Exact response shapes of `GET subWorkflow`, `POST postSubWorkflow` (201?) and `GET getDetailsforMainworkflow` on **V6**.
3. Is `PUT /transaction/updateSubWorkflow/...` still needed on V6? What does it do?
4. V6 replacement for `POST /report/workflowAuditWithSlaFields/{id}`: how do we get a child's `requestNo / stage / flowStatus / lastAction / duration` by `processId`? Can `GET subWorkflow` return these directly?
5. Do V6 inbox/list responses include `subworkflowTransaction[]`, and does `processHistory` include `subWorkflowHistory[]`?
6. Cascade rules (parent withdrawn/deleted, orphan child when a new parent is abandoned) and protection against loops or deep nesting.

## 4a. Backend status

Built in `api/`. Tested on 2026-10-31 through a local API against a real tenant database in live mode: the save fix, all three endpoints, the 400/401/404/409 rejections, and on screen the Sub Process tab plus opening a child and returning through its parent link. The 403 access check is covered by unit tests only, and hiding rows from a user without access is untested, as both need a non-admin user. The Initiator on an existing request was also run end to end on screen: Initiate, submit the child form, automatic link, Sub Process count and row, child's parent link. Not run live: Initiate on a new request (START step), and pre-fill with real parent values, as the parent used had an empty form:

- **Links:** `WorkflowSubProcessController` and `WorkflowSubProcessService` store links in `workflow.sub_process_links` (`scripts/postgres/Create_WorkflowSubProcessLinks.sql`). The table is created on the first link, because the workflow schema middleware doesn't reapply to existing tenants. Reads never run DDL.
- **Endpoints:** `GET workflow/subWorkflow/{wId}/{pId}`, `POST workflow/postSubWorkflow` (201) and `GET workflow/getDetailsforMainworkflow/{wId}/{pId}` answer Q2. Ids are GUIDs: a process id is the workflow instance id.
- **Rules:** a child has one parent, links are one level deep (so no loops), and repeating a link is a no-op. Linking needs access to both workflows; reads leave out rows from workflows the user can't access.

Still open:

- Q1 and Q6: the Connector engine, and what happens to a child when its parent is rejected, withdrawn or force-closed.
- Q3: `putSubWorkflow` isn't built, as nothing calls it.
- Q5: `subworkflowTransaction` and `subWorkflowHistory` on list and history responses.
- Linking doesn't check that the parent's step really targets that child workflow, or that the user is the current assignee. The web app does check these.
- A child created for a new parent stays unlinked if that parent is never submitted.
- After jumping between a parent and child in different workflows, Back can land on the previous workflow's list.
- The requests store keeps its own copy of the workflow after a publish. Sub-workflow settings now read the saved workflow (`useLatestWorkflow`), but other stage settings on an open request can still use the old copy until it's reopened.
- The Initiate button's long label squeezes the request header on narrow windows.
- Document workflows with no repository (`repositoryId` null, such as Document Approval on the test tenant) ignore uploads with no message (`addAttachment` in `useWorkflowForm.ts`), so they can't be used as a child.

## 5. Phases

Each phase ends with: the code done, a targeted type-check of the changed files, a browser check where the change is visible, and your sign-off before the next phase.

### Phase 1 — Foundation (types, API, hooks, utils)

**Done.** Everything is in `src/features/sub-workflow/` (import from `@/features/sub-workflow`):

- `types.ts`: `ConnectorBlockSettings`, `InitiatorBlockSettings`, `SubWorkflowLink`, `SubProcessRow`, `MainProcessDetails`, `SubWorkflowHistoryRow`, `SubWorkflowPrefillField`.
- `utils/blockSettings.ts`: read/write the flowJson block keys. Turning the initiator off resets both keys (fixes the V5 stale-`true` bug), and the read side treats the V5 stale case as off.
- `utils/permissions.ts`: `getInitiatorSubWorkflowId(parentWorkflow, activityId)` and `canInitiateSubWorkflow(childWorkflow, session)` (the V5 rules).
- `utils/prefill.ts`: `buildSubWorkflowPrefill` (match by label, ignoring case; tables match by column label; skips DIVIDER/LABEL/PARAGRAPH/disabled) and `applySubWorkflowPrefill` (never overwrites typed values).
- `utils/status.ts`: `getSubProcessStatus` → completed / running / forceClosed, plus icon and colour.
- `api/subWorkflowApi.ts`: `getSubProcesses`, `getMainProcess`, `linkSubProcess`, choosing mock or live. The live mappers accept V5 field names.
- `api/queries.ts`: `useSubProcesses`, `useMainProcess`, `useLinkSubProcess` (invalidates both lists).
- `api/mock/`: seed JSON (parent `PR-0031` workflow 10 / process 555 → three children: running, completed, force-closed) plus the mock store.
- `subWorkflow.test.ts`: 11 vitest tests, all passing.
- Not done: `updateSubWorkflowProcess` (backend Q3). It'll go into `linkSubProcess` once confirmed.

### Phase 2 — Builder: Workflow Connector node

**Done.**

- `NODE_TOOL_TYPE.WORKFLOW_CONNECTOR = 'workflow_connector'`. Palette entry "Workflow Connector" in the Triggers/logic column of `AddNodeMenu.tsx` (icon `lucide:workflow`, colour `#EA22EB` as in V5).
- `components/settings/WorkflowConnectorSettingsPanel.tsx`: info banner, a required "Connected Workflow" picker, and the shared Connections/Routing section. Picking a workflow sets the node card subtitle to "Starts &lt;name&gt;"; with no target the node shows the warning state.
- `components/settings/common/SubWorkflowPicker.tsx` (reused in Phase 3): published workflows from `POST /workflow/all`, with the workflow being edited left out.
- JSON: node data → block `settings` (`subWorkflowId`, `subWorkflowName`, `label`), `type: 'WORKFLOW_CONNECTOR'`. Import handles both V6-saved and V5-saved blocks.
- Publish check (`utils/workflowConnector.ts` → `BuilderHeader.tsx`): a connector without a target, or pointing at its own workflow, blocks publish with a toast. Drafts can still be saved.
- Tests: `utils/workflowConnector.test.ts` (export/import round trip, V5 import, validation).
- Checked in the browser on 2026-10-27 (signed in, real published-workflow list). Save/publish requests were caught in the page and stopped, so no workflow was created:
  - Add → panel → picker lists real published workflows → select → node reads "Starts &lt;name&gt;".
  - Saved JSON has a `WORKFLOW_CONNECTOR` block with `subWorkflowId` (V6 workflow GUID), `subWorkflowName`, label, `#EA22EB`, a routing rule, and no UI-only keys.
  - Publish with no target → toast, no request sent. Publish with a target → `PUBLISHED` payload.
  - Importing that captured JSON restores the node, its target and subtitle.
  - Fixed during the check: a newly added connector now shows the warning marker straight away (`AddNodeMenu.tsx`).

### Phase 3 — Builder: Workflow Initiator toggle

**Done.**

- New "Sub Workflow" section in the Manual User panel (`components/settings/manual-user/WorkflowInitiatorTab.tsx`), which also covers the form-submission start node. It has a "Workflow Initiator" switch and, when on, the shared required `SubWorkflowPicker`. The section opens by itself when the initiator is on.
- Export: every START / INTERNAL_ACTOR block gets both keys via `writeInitiatorSettings`. Off, or on with no workflow picked, saves as `workflowInitiator: false, subWorkflowId: 0` and drops `subWorkflowName`. Import reads them back with `readInitiatorSettings`, so V5's stale `true` + `0` loads as off.
- Publish check: `getWorkflowInitiatorErrors` (no target / self-reference) runs next to the connector check in `BuilderHeader.tsx`.
- Tests: 4 more in `utils/workflowConnector.test.ts` (18 total across sub-workflow tests).
- Checked in the browser on 2026-10-27, with save requests caught and stopped:
  - The section and switch render, and the picker appears when on.
  - Saved JSON for on with no target, on with a target (GUID + name) and off is as described above.
  - Importing the saved JSON restores the target.
  - Publish with the initiator on and no target → toast, no request sent.

### Phase 4 — Request sheet: Initiate button + child form + link

**Done.**

- `features/sub-workflow/hooks/useSubWorkflowInitiator.ts`: works out the current block's initiator (START for a new request, the `activityId` block otherwise), loads the child workflow and checks `canInitiateSubWorkflow`.
- Permission rule adapted to V6 definitions, which have no `initiateMode` / `initiatedBy`:
  - Definitions are read from `workflowJson` (V6) or `flowJson` (V5).
  - Email-triggered or document-only children are blocked; otherwise any non-email start counts as manual.
  - Users listed / `"0"` / domain allowed. If nobody is restricted, anyone can start it.
  - V5 workflows keep their exact V5 rule.
- **Existing request** (`Request.tsx`): an "Initiate - &lt;child&gt;" button in the request header (new `extraActions` slot) for the assignee who can act. It swaps the request view for `components/sub-workflow/SubWorkflowRequest.tsx` (a banner plus the child's normal new-request form). On submit the link is made through `useLinkSubProcess` (mock until the API is ready) with a toast, then the view returns to the parent.
- **New request** (`WorkflowRequest.tsx`): the same button when the START step has the initiator. Children are created first and shown as "will be linked" chips, then linked after the parent's submit returns its `processId`. One level only: the child form has no Initiate button.
- `WorkflowRequest` gained `title`, `prefill` (one-time copy of same-label fields, never over typed values), `onSubmitted` and `allowSubWorkflow`. The new-request header gained `extraActions`.
- Tests: 4 more for the V6 permission rules (22 sub-workflow tests total).
- Checked in the browser on 2026-10-27. Workflow definitions were patched in the page to switch on the initiator, and start calls were answered in the page, so nothing was created on the server:
  - New request: the button shows; the child view's banner, title and steps render; Description pre-fills; submitting the child returns to the parent with a "DA-SIM-1" chip.
  - The parent submit itself couldn't be completed: its form requires a real receipt upload.
  - Existing request EXP-2026-101: the button sits next to Force Close / Reject / Approve; submitting the child records the link in V5 `postSubWorkflow` shape, shows the toasts and returns to the parent.
- Not covered: the AP (non-generic) request header doesn't show the button. Plan: add it there in Phase 7 if needed.

### Phase 5 — Sub Process tab & parent link

**Done.**

- "Sub Process" tab (sitemap icon + count) in the generic request header (`Header.tsx`: new `subProcessCount` prop; the right-view type now includes `'subProcess'`).
- `components/sub-workflow/SubProcessPanel.tsx`, rendered in `GenericRequestOverview`'s right panel:
  - One card per child: request number, status chip (Completed / Running / Force Closed), and workflow · stage · "x ago".
  - Skeleton while loading, an empty state, and an error state with retry.
- `hooks/useOpenLinkedRequest.ts`: opens a child or parent in place, the same way the All Workflows inbox does (`loadOverviewWorkflow` + `findRequestRow`). Edit vs read-only follows that request's normal rules. Shows a toast if the request can't be found (e.g. mock-only ids).
- `components/sub-workflow/ParentRequestLink.tsx`: a parent link chip in a child's header (green when the parent is finished, orange while it's running) that opens the parent. Shown when `useMainProcess` finds a parent. It's icon-only below the `2xl` breakpoint, with the parent number in the tooltip and aria-label, so the child's own title isn't squeezed.
- Type-check and lint are clean for these changes.
- Checked in the browser on 2026-10-27, signed in, with mock links seeded between real requests EXP-2026-101 → EXP-2026-100 plus one fake child, DA-SIM-7:
  - The Sub Process tab shows on generic requests; with no links you get the "No sub-processes yet" empty state.
  - With links: tab badge 2, "Sub Process (2)", cards with Running / Completed chips and workflow · stage · age.
  - Clicking the fake child shows the "Couldn't open this request" toast and you stay put.
  - Clicking EXP-2026-100 opens it in place, with an orange parent chip; clicking the chip opens EXP-2026-101, which has no parent chip.
  - Fixed during the check: the chip showed its request number at every width and squeezed the child's title to "EXP…".

### Phase 6 — Lists & history

**Done (localhost-only, mock data).**

- **Inbox cards** (`GenericGridCard.tsx`, the default grid view of generic workflows): a "sitemap · N ▾" chip next to the request number when the row has children. It expands `components/sub-workflow/SubProcessRows.tsx` inline under the card: status icon, request number, workflow · stage · age. Clicking a row opens that child in place.
  - Data comes from `useRowSubProcesses` (`features/sub-workflow/hooks`). Live mode reads the row's own `subworkflowTransaction` (V5 field, mapped by `toSubProcessRow`). Mock mode makes one `useSubProcessesForWorkflow` query per workflow, shared by every card, so there are no per-row calls.
- **History** (`History.tsx`): steps with child steps get an orange "Connector" badge and a collapsible `components/sub-workflow/SubWorkflowHistoryBlock.tsx` (child request number, step count, then a Stage / User / Received / Processed / Status table).
  - Live rows use their own `subWorkflowHistory`.
  - Mock entries come from `useSubWorkflowHistory` and are merged by `attachConnectorHistory` (matched to a step by name, otherwise appended as a connector step).
  - The empty-history check now looks at the merged list.
- Per-child history / attachments / comments shortcuts: covered by opening the child, whose own tabs have them. No separate shortcuts were added.
- **Not covered:** the table and kanban views have no child rows (the grid is the default view), and AP workflows use a different card.
- Tests: `attachConnectorHistory` and the mock's grouped children (27 sub-workflow tests total).
- Checked in the browser on 2026-10-27, with mock links and a connector history entry seeded on real request EXP-2026-101:
  - Only EXP-2026-101 shows the chip ("2"); expanding lists EXP-2026-100 and DA-SIM-7, and clicking EXP-2026-100 opens it, with its parent link back to EXP-2026-101.
  - EXP-2026-101's history shows its two real steps plus "Document Approval (connector)" with the Connector badge; expanding shows both DA-SIM-7 steps with the right users, dates and statuses.
- **Live-mode dependency:** backend Q5 (do V6 list/history responses include these fields?).

### Phase 7 — Other surfaces, mobile, polish

**Code done; mobile browser check pending (the pane was signed out).**

- **Mobile** (`pages/mobile/features/invoice-detail/`): `InvoiceDetailScreen.tsx` gets a "Sub process · N" tab (read-only list: status icon, request number, status, workflow · stage · date) and a "Sub-process of &lt;parent&gt;" strip at the top when the request is a child. Both live in `SubProcessSection.tsx`, use the mobile primitives, and are behind the localhost switch.
  - Not done on mobile: initiating a child, tapping to open a child or parent, and the inbox list cards.
- **Accounts Payable request header**: the "Initiate - &lt;child&gt;" button now also shows in the AP header layout (`Header.tsx` non-simple branch, `extraActions`). The child form is pre-filled from the AP request's form panels.
  - The Sub Process tab and parent link stay on generic workflows only, because the AP overview has a different right-panel.
- **Other surfaces**:
  - Reports (`OverviewTab`) and embed (`/embed/requests`) reuse `Request` / `RequestsPage`, so they already have everything.
  - The portal and dashboard don't render request screens, so there was nothing to wire there.
- `lingui extract/compile` runs as part of `npm run build`. No dead code was left behind; the only temporary code is the localhost switch (§3a).
- Final checks: 27 sub-workflow tests pass; type-check and lint are clean on the changed files.

## 6. Progress

- [~] Phase 0 — backend answers (Q2 and Q4 answered by §4a; Q1, Q3, Q5 and Q6 open)
- [x] Phase 1 — foundation (types, utils, mock-backed API + hooks, tests)
- [x] Phase 2 — connector node
- [x] Phase 3 — initiator toggle
- [x] Phase 4 — initiate + create + link
- [x] Phase 5 — Sub Process tab + parent link
- [x] Phase 6 — lists & history (grid view + history; table/kanban views not covered)
- [~] Phase 7 — mobile, other surfaces, polish (code done; mobile browser check pending)
