# EZOFIS Mobile (V6)

React + Vite app wrapped with Capacitor 7 for Android and iOS. Business-user scope: Home dashboard, Workflow inbox / actioned, request detail with dynamic actions, Folders with AI upload, classification and metadata review, Notifications and Settings. Signed-in users get live data from the EZOFIS Workflow API (cloud.ezofis.com); "Explore" mode shows sample data from `src/data.js`.

## Run in a browser

```bash
npm install
npm run dev            # http://localhost:5173
```

Add `?platform=ios` or `?platform=android` to the URL to force a platform style, or switch it in **Settings › Platform style**.

## Official Android build (Android Studio)

```bash
npm install
npm run build
npx cap sync android
npx cap open android   # then Build › Build Bundle(s) / APK(s)
```

## Official iOS build (Xcode, macOS)

```bash
npm install
npm run build
npx cap sync ios       # resolves Swift packages / CocoaPods on the Mac
npx cap open ios       # set your Team under Signing & Capabilities, then Run
```

## Test APK (v0.4.5)

The test APK was assembled without the Android SDK by `apk-shell/build_apk.py`. It's a minimal WebView wrapper that loads the single-file build (`SINGLE=1 npx vite build` → `dist-single/index.html`). `apk-shell/sign_v2.py` signs it with a throwaway test key. The key is created in `apk-shell/` on the first run and is git-ignored, so it is never committed:

```bash
SINGLE=1 npx vite build
python3 apk-shell/build_apk.py dist-single/index.html apk-shell/ic_launcher.png /tmp/unsigned.apk
python3 apk-shell/sign_v2.py /tmp/unsigned.apk EZOFIS-Mobile-test.apk apk-shell
```

The APK targets Android 7.0+ (API 24, targetSdk 34, APK Signature Scheme v2). It is for review only. Release builds should come from the Capacitor Android project above, signed with your own key.

## Responsive layout

| Width | Layout |
|---|---|
| < 768 px (phones) | Bottom tab bar (Home, Inbox, Folders, Settings), full-screen detail pages |
| 768–959 px (small tablets) | Navigation rail with Upload button, single-column pages |
| ≥ 960 px (tablets) | Rail + split view: inbox list beside request detail |
| ≥ 1200 px | Expanded rail with labels and the EZOFIS logo |

iOS gets centred titles and a translucent tab bar; Android gets left-aligned titles and Material-style tab indicators.

## Connecting the real API

Sign-in (`src/api.js`) and the Workflow API (`src/wf.js`, `src/formEngine.js`) are wired to cloud.ezofis.com; see the Workflow API section below. Folders and notifications still use sample data until those APIs exist.

## Workflow API (Workflow API Full Reference, 26 Oct 2026)

When you are signed in, Home, Workflow (Inbox / Sent / Completed, ticket detail, actions) and Settings use the live API. "Explore with sample data" keeps the sample screens. Calls are in `src/wf.js`; screens are in `src/screens/LiveWorkflow.jsx` and `Home.jsx` (`LiveHome`). Every call sends `Authorization: Bearer` + `X-Tenant-Id`. Any 401 clears the session and returns to sign-in.

| Screen | Endpoint(s) |
|---|---|
| Profile (Home greeting, Settings) | `GET /api/usersession` |
| Home: inbox total, new today, per-workflow bars, aging, AI insight | `GET /Workflows/inbox/all-workflows?itemsPerWorkflow=20` |
| Home / tabs: Sent and Completed totals | `GET /Workflows/counts` (summary table, may lag) |
| Workflow picker | `GET /Workflows` (status 0 = draft, hidden) |
| Inbox, all workflows (grouped "My Requests") | `GET /Workflows/inbox/all-workflows` |
| Inbox / Sent / Completed, one workflow | `GET /Workflows/{inbox,sent,completed}?workflowId&pageNumber&pageSize=20` with "Load more" |
| Sent / Completed, all workflows | the same call for each workflow (4 at a time, 10 each), merged newest first |
| Tab counts, one workflow | `GET /Workflows/instance-count?workflowId` (used by the web app) |
| Card labels / preview values | `GET /Workflows/{id}` (`workflowJson.settings.general.previewValues`) + `GET /form/{formId}` |
| Ticket detail | `locate`, `instances/{id}`, `history`, `comments`, `attachments` for the ticket, fetched together |
| Form tab | form schema labels + row `formData` (tables as rows, files by name); falls back to `repositoryItem.fields` (e.g. AP agent stage); AI card from `agentResponse` |
| Action buttons (dynamic) | `workflowJson.rules` where `fromBlockId` = the row's `activityId`; label = `proceedAction`. `remarks` → comment required; `signature` / `passwordAccess` → blocked with "use the web" |
| Approve / Reject / any action | `POST /Workflows/instances/{instanceId}/move-next` `{ activityid, review, comments, formData? }` |
| Edit form | text/number/date fields when the step's `formEditAccess` is `ALL`; sent as `formData` (full snapshot) with the next action |
| Add comment | `POST …/comments` `{ comments, stepInstanceId: null, externalCommentsBy: null, showTo: 0 }` |
| Add attachment | `POST …/attachments` multipart (`file`, `repositoryId`, `transactionId`) |

| Open a file (§5.7): attachments tab, the ticket's source document, file cells in form tables, and the file chip on list cards | `GET /repositories/{repositoryId}/items/{itemId}/file?disposition=inline` (same call as the web viewer). PDFs render in-app with pdf.js, e-mails (.eml and Outlook .msg) as a readable message (subject, from, to, date, HTML/text body, tappable attachments; scripts never run), Word .docx as a document, Excel .xlsx/.xls/.csv as sheet tables (first 500 rows per sheet), PowerPoint .pptx as slide text and pictures, images inline, text files as text. Older .doc/.ppt have no preview and can be saved |
| Line items | from the AI agent response (`debug` "Side-by-side Line Item matching" → invoice vs PO with scores; else "Extracted Invoice JSON" › "Line Item"), else `repositoryItem.fields.InvoiceExtractedLineItem` |
| New request (§9) | workflow picker (Active workflows whose START block includes you) → the form behaves like the web form (`src/formEngine.js`): **defaults** (`defaultValueType` / `defaultValueInSelectField` / `fillValueType`: current user email / name, today, auto-generate, custom), **master-data dropdowns** (`GET /form/{masterFormId}/entry/all`, filtered by `masterFormConditionColumn` and the parent chain; a single match is preselected), **auto-filled fields** (`fillValueType: MASTER` from the parent's master row), **cascades** in tables (`lookupSettings.cascadeFromColumn`), **calculations** (`formulaTokens`: FIELD / OPERATOR / TABLE_SUM), **conditional required** (`mandatorySettings`), read-only / hidden fields, file type and size checks, and **OCR** on file controls (`assignOtherControls`): `POST /uploadAndIndex/uploadForOcr` fills the assigned controls; on submit `POST /uploadAndIndex/uploadWithOcr` stores the file and its `{ fileId, repositoryId }` goes into formData and `stagedFiles`. Then `POST /Workflows/{id}/start/json` (or multipart `/start` when extra attachments are added); the optional comment is posted to the new ticket |

Hidden on every screen: OCR text, tenant / workflow-instance / storage-provider / repository IDs and other technical keys (see `isTechnicalKey` / `isTechnicalLabel` in `src/wf.js`).

Not wired yet: filter-fields, `by-activity`, notifications (no API; the list shows this device's actions), Folders (sample data until a Folder API doc).

Note for the test APK: from 0.4.1 the WebView shell has a file chooser (WebChromeClient.onShowFileChooser → system document picker, one file per pick), so uploads work. "Save a copy" (downloads) still needs the Capacitor build. Every upload is limited to 20 MB per file.

Master rows are fetched with every column; the app keeps only the columns the form references. **Security:** the Users master form returns a plain-text `Password` column to any user who can read it; remove that column on the server.

## Sign-in (EZOFIS Signup & Login API, 26 Oct 2026)

Implemented in `src/api.js` (endpoints, errors, session) and `src/screens/Onboarding.jsx` (screens).

| Step | Endpoint | Screen |
|---|---|---|
| Email → organizations | `GET /api/auth/tenants?email=` | Sign in (email). Empty list → "No EZOFIS account uses this email". |
| Pick organization | — (`requiresOrgSelection` or >1 tenant) | Choose organization |
| Password | `POST /api/auth/ezofis/login` + `X-Tenant-Id`, body `{ email, password, loggedFrom: "MOBILE" }` | Enter password (401 → "Email or password is incorrect") |
| 2FA | `POST /api/auth/2fa/complete` `{ tempToken, code }` (no `loggedFrom`; the server carries it over) | Verify it's you: 6-digit code, countdown from `expiresInSeconds`, "Send a new code" (Email OTP only) |
| Guest share token | (5.3) | Explains the invite link; `/auth/share/set-password` is not built |
| Google / Microsoft | native SDK → `GET /auth/tenants` → `POST /api/auth/social/login` | Same buttons; needs the native plugin below |
| Switch organization | `GET /api/me/tenants` (Bearer) | Settings › Organization |

After sign-in the app stores `accessToken`, `expiresAt`, `userId`, `tenantId`, `tenantName`, `role`, `email` (never `databaseName` / `connectionString`), goes straight to Home, and on later launches opens Home directly until the token expires. The 2FA code screen appears only when the login response is a 2FA challenge (`tempToken`). "Sign out" clears the session.

Production hardening: move the session and passcode from `localStorage` to secure storage (Android Keystore / iOS Keychain, e.g. a secure-storage Capacitor plugin).

`loggedFrom` (Login Channel API, 26 Oct 2026) is set by `LOGGED_FROM` in `src/api.js`. It is sent only on the email/password login; social login doesn't accept it yet.

### Networking
The server returns `Access-Control-Allow-Origin: *` but rejects the CORS preflight (400) that requests with `X-Tenant-Id` trigger. So:
- Capacitor build: `CapacitorHttp` is enabled in `capacitor.config.json`, so `fetch` runs natively with no CORS.
- Test APK: the WebView allows universal access from the bundled file.
- Browser preview: calls are blocked; use "Explore with sample data", or allow the preflight on the server.

### Google and Microsoft sign-in
Google is implemented natively for Android in `android/app/src/main/java/com/ezofis/mobile/EzofisSocialAuthPlugin.java` (Credential Manager, "Sign in with Google"), registered in `MainActivity.java`, with dependencies in `android/app/build.gradle`. The web layer calls it from `src/social.js`. Microsoft (MSAL) and iOS are not wired yet.

To make Google sign-in work (all in ONE Google Cloud project):
1. **Android OAuth client** whose package name and SHA-1 match the APK you install:
   - this project's package is `com.ezofis.mobile` (`capacitor.config.json` → `appId`, `android/app/build.gradle` → `applicationId`);
   - SHA-1 is the fingerprint of the keystore that signs the build (`keytool -list -v -keystore <your.keystore>`); debug builds from Android Studio use `~/.android/debug.keystore`.
   The existing client "EMP Portal Mobile APP" (project 139628703331) is for `com.ezofis.teams.hub.ezofis_mobile_hub` with SHA-1 `E3:9E:88:…:51:42`. Either add a new Android client for `com.ezofis.mobile` + your SHA-1, or change this app's package to that one and sign with that keystore (it would then replace that app on devices).
2. **Web OAuth client** in the same project → put its id in `android/app/src/main/res/values/strings.xml` as `google_web_client_id`. (The cloud.ezofis.com web client `154003149422-…` is in a different project and won't work with the 139628703331 Android client.)
3. Build in Android Studio and install on a device with Google Play services.

**Security:** per the API doc, `POST /auth/social/login` does not yet verify a Google/Microsoft token. Do not ship social sign-in until the backend verifies the provider ID token. The app never lets a user type the email for social sign-in; it only sends the email returned by the provider SDK.

## Ask EZOFIS AI (v0.4.5)

Signed-in users open Ask AI from Home (the Ask AI quick action, the Ask AI card or one of its suggestion chips) or from the tablet rail. The chat calls `POST /api/repositories/assistant/chatbot`; see `docs/workflow-api-integration.md` for the details. In a chat:
- The assistant searches documents, folders, requests, comments and form entries, and remembers earlier questions in the same chat.
- Answers show the applied filters and result cards. **Open file** shows the document in the in-app viewer (PDF, Office, e-mail, images) with its metadata. **View request** opens the ticket.
- When results sit in several repositories, the assistant asks which one to search. The chosen repository shows above the input and can be cleared.
- Answers can take up to 2 minutes, so the app shows progress and a **Stop** button. **New chat** starts a fresh conversation.
- "Explore with sample data" keeps the offline sample answers.

## Auto-refresh and phone notifications (v0.4.4)

- **Auto-refresh** (`src/LiveWatcher.jsx`): while signed in, the app polls `GET /Workflows/inbox/all-workflows?itemsPerWorkflow=10`. It polls every 45 s while the app is open and every 2 min in the background, and also immediately on resume, on reconnect, or when you return to the app. New requests update the inbox badge, appear in the in-app Notifications list and refresh Home / Inbox. Forms and open tickets are not reset; their changes apply when you go back to a list. It can be turned off in Settings.
- **Phone notifications** (`src/notify.js`): posted when new requests arrive while the app is not on screen. You can turn them on in Settings, or from the banner on Notifications.
  - Release build (Capacitor): `@capacitor/local-notifications`. Run `npx cap sync` after `npm install`.
  - Test APK: a native bridge in the WebView client, called via `prompt('ezofis:notify'|'ezofis:perm')`. It creates a "Workflow updates" channel and asks for POST_NOTIFICATIONS on Android 13+.
  - Browser: the Web Notification API.
- **Limits:** these notifications come from the app's own polling, so they only appear while Android keeps the app in memory. Notifications after the app is swiped away or the phone has been idle for a while need server push. That means FCM/APNs plus a backend endpoint to register device tokens and send on new inbox items, which the Workflow API does not have yet.
