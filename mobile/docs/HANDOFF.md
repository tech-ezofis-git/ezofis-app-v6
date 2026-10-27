# EZOFIS V6 Mobile — handoff (27 Oct 2026)

This app was built in a Claude chat session from 25 to 27 Oct 2026 and moved here at v0.4.4. This file records what was built, what was decided and what is still open, so development can continue in Claude Code.

## Version history
| Version | What changed |
|---|---|
| 0.1.x | EZOFIS V6 mobile theme and design canvas; React + Capacitor app with sample data; first test APK |
| 0.2.x | Sign-in API (tenants, org switch, 2FA). 0.2.3 sends `loggedFrom: "MOBILE"` and completes 2FA through `POST /api/auth/2fa/complete` |
| 0.3.0 | Workflow API, endpoint by endpoint: user session, workflow list, Inbox/Sent/Completed, ticket detail (history, comments, attachments), move-next, counts, all-workflows inbox |
| 0.3.1 | Start-workflow screen; attachment links; technical fields hidden; Show/Hide empty fields; line items from the response JSON; tabs and counts fit on one line on small phones |
| 0.3.2 | Home: "Updates for you" replaces the "Clear your inbox" banner, divider between Quick actions and Dashboard, Ask AI highlighted after sign-in |
| 0.3.3–0.3.5 | §5.7 file view everywhere; §9 New request limited to workflows the user may start; in-app viewers for eml, msg, docx, xlsx and pptx |
| 0.4.0 | New request matches the web form (`formEngine.js`): user defaults, master data, dependent fields, formulas, conditional required, OCR auto-fill |
| 0.4.1 | Uploads work in the APK (WebView file chooser); 20 MB limit per file |
| 0.4.2 | File viewer: file on the top 70%, metadata on the bottom 30% with scroll, download/share icons, AI Summary overlay button |
| 0.4.3 | Per-workflow tabs from `requestTabs` (by-activity); action button text and colour from `buttonColor`; tab badge = list total; simpler workflow picker in New request |
| 0.4.4 | Home: updates card overlaps the hero (40/60), then Quick actions, then Ask AI, then Dashboard; background auto-refresh; phone notifications |
| 0.4.5 | Ask EZOFIS AI on the Repository Assistant chatbot API (`/app/ask`): one session per chat, rich answers (text, filters, result cards, repository picker), documents open in the in-app file viewer, requests open the ticket, Stop / Try again / New chat; Ask AI in the tablet rail |
| 0.4.6 | Folders on the repository API: repositories, folder tree with subfolders, file lists and search, file view with metadata / OCR confidence / AI summary, edit details and delete; bulk upload with live OCR progress, staged files ("To review"), review & export or delete. `uploadWithOcr` also sends `metadata` |
| 0.4.8 | Corrections: last folder level lists its files (browse leaf rule as the server sends it); folder list shows short names only (no description, no storage); back button on Folders / Workflow / Settings; "To review" tab removed — drafts are on Upload and survive leaving the app; Edit / Delete / Request signature / Upload follow folder-security permissions; AI summary as a designed card, saved summary (`SummaryJson`) shown at once without a new credit; metadata form from the repository field definitions (date, number, yes/no, dropdowns from predefined / unique / master values with cascades and auto-fill, read-only, required marks and validation, table editor; OCR tables stored as `{"data":[…]}`); intelligent upload saves a draft right after OCR |
| 0.4.7 | MOBILE_APP_REPOSITORY_API: intelligent upload (AI picks the folder → OCR → review → archive), structured AI summary (key facts, highlights), share by email (can view / can edit, remove access), Shared with me, request signatures (one by one / all at once, status, cancel), To sign list and signing on the PDF (draw, place, sign or decline). Sheets render on `<body>` and never squeeze their content |

## Still open
1. **Server push** for notifications when the app is closed. The backend needs to register device tokens and send through FCM (Android) / APNs (iOS) when an inbox item is created. Today notifications come from the app's own polling, so they only work while Android keeps the app in memory.
2. **Security (backend):** the "Users" master form returns a plain-text Password column from `/form/{id}/entry/all`.
3. **Google / Microsoft sign-in:**
   - Needs a Google Web client ID and a package decision. Keep `com.ezofis.mobile`, or switch to the existing `com.ezofis.teams.hub.ezofis_mobile_hub`, which would replace that app on users' phones.
   - Needs backend token verification before release.
4. **Release builds:** a real signing key and Gradle build from `android/`, and an iOS build in Xcode (set the Team).
5. **Not wired yet:**
   - No notifications API (the in-app list is built on the device).
   - AP agent job polling after start is not shown.
6. **Not tested on a real device yet:**
   - the phone-notification bridge in the test APK (`onJsPrompt` in `apk-shell/build_apk.py`);
   - background polling while the app is in the background.
7. **Ask AI (0.4.5), not checked against the live agent yet:**
   - The `chatbot_result` shape was taken from the agents code (`agents/app/agents/chatbot_agent.py`, `agents/app/chatbot/format_blocks.py`) and the web client (`app/src/components/common/ask-ai/`), and tested with mocks only.
   - Actions the agent proposes (`pending_action`: start workflow, upload, create user) are confirmed through `POST /actions/{id}/confirm` on the agents service, which V6 doesn't proxy. The app tells the user to finish them on the web.
   - Form-entry results have no mobile screen yet ("Open on the web").
8. **Folders (0.4.6), not checked against a live tenant yet:**
   - Tested with mocks shaped on the API contracts (`api/src/Modules/Repository/Repository.Application/Contracts`).
   - Form designer (create/update/delete form) and form-entry writes are admin/web functions; the app only reads forms and master entries.
   - Raw OCR text stays hidden on purpose (CLAUDE.md rule). Extracted values and OCR confidence are shown.
9. **Share & sign (0.4.7), not checked against a live tenant yet:**
   - Tested with mocks shaped on `RepositorySignRequestContracts.cs` / `RepositoryShareContracts.cs` and the agents `document_intelligent_result` / `summary_result` contracts.
   - Recipients without an app session (share link and sign invite: preview → OTP → verify) use the web; the app covers the logged-in user (shared with me, pending-for-me).
   - There is no API to list the shares on a document, so "Remove access" is offered for shares made in the open sheet only.
   - The signature is placed at a tapped point at about 160 × 50 pt (scaled to the drawing); it can't be dragged or resized yet.
10. **Design canvas:** the C5/C6 file-viewer proposals in `docs/design-canvas/` were replaced by the 70/30 layout that is now in the app.

## Server behaviour seen during development
- **Errors:** GET /Workflows/{id} sometimes returned 500 or timed out; the app shows retry buttons.
- **Counts:** /Workflows/counts lags behind the lists, so the open tab's badge always shows the list's own `totalCount`.
- **CORS:** the server rejects the CORS preflight from browsers, so the web preview only works in "Explore" (sample) mode. The test APK loads from `file://`, which allows the calls.

## Design files
`docs/design-canvas/*.dc.html` + `canvas.json` are the source of the Claude Design canvas (A: welcome/brand, B: home/inbox/ticket, C: folders/files). They are design references, not app code.

## Testing
`tests/e2e/` holds a Python + Playwright mock of the Workflow API (`wfmock.py`, `expform.py`, shaped like the live responses with fake data) and 16 flow checks (`test_flow*.py`; 13 Ask AI, 14 Folders, 15 intelligent upload / summary / share / sign, 16 the 0.4.8 corrections). They run against `dist-single/index.html` with every call to `https://cloud.ezofis.com/**` intercepted.

The checks print what they find rather than asserting; read the output and look for `errors []`. Screenshots go to `tests/e2e/shots/`.
