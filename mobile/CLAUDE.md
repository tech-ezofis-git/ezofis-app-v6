# EZOFIS V6 Mobile — notes for Claude

Mobile app for EZOFIS V6 (workflow inbox, approvals, new requests, files, AI). It is a React 18 + Vite 5 app, wrapped with Capacitor 7 for Android and iOS. This folder (`mobile/`) is independent of `../app` (the web front end) and `../api`.

History, decisions and open items: `docs/HANDOFF.md`. API mapping: `docs/workflow-api-integration.md`. How-to steps: the `ezofis-mobile-dev` skill.

## Commands (run from `mobile/`)
```bash
npm install
npm run dev                       # browser; live API calls are blocked by CORS, so use "Explore with sample data"
npm run build                     # dist/ for Capacitor → npx cap sync android|ios
SINGLE=1 npx vite build           # dist-single/index.html (one file) for the test APK and previews
tests/e2e/run_all.sh              # mock end-to-end checks (Playwright + Python), no live server
python3 apk-shell/build_apk.py dist-single/index.html apk-shell/ic_launcher.png /tmp/u.apk && \
python3 apk-shell/sign_v2.py /tmp/u.apk EZOFIS-Mobile-test.apk apk-shell     # SDK-free test APK
```
Before a test APK, bump `versionCode` / `versionName` in `apk-shell/build_apk.py` (`manifest_xml`). The current version is 35 / 0.6.0.

## Code map
- `src/api.js`: sign-in (`loggedFrom: "MOBILE"`, 2FA, tenants), session storage, `authed()` (Bearer + `X-Tenant-Id`). A 401 dispatches `SESSION_EXPIRED`, which sends the user back to login.
- `src/wf.js`: Workflow API client `wfApi`. Also:
  - meta and form cache (`getMeta`, `getForm`);
  - `toCard`, `formView`, `actionsFor` (rules: `proceedAction`, `buttonColor`);
  - `tabsFor` (`settings.general.requestTabs`), line items, hidden technical fields, `canStart`.
- `src/controls.jsx`: shared field controls (type → kind, value shapes as the web stores them, display, empty / format checks). Used by New request, the approver's Edit form and MetaForm; add new field types here first. Also the settings rules (`ruleError`, `limits`: content rule, length, number range / decimals, date and time limits), prefix / suffix, help text and tooltip, and the shared `SignaturePad` (also used for signing PDFs).
- `src/scan.js`: QR / barcode from a camera photo (BarcodeDetector, else `@zxing/library` loaded on demand) and `forKind` to fit the scanned text to the field. `tests/e2e/fixtures/make_qr.cjs` writes test QR images.
- `src/formRules.js`: show / read-only / mandatory conditions from the field settings (`enableSettings`, `readonlySettings`, `mandatorySettings`, `settings.logic`, form `settings.rules`), ported from the web `ruleEngine.ts`, for fields and sections (panels); rules may name fields by id, `jsonId` or `name`.
- `src/formEngine.js`: New-request form with web-form parity: defaults, master-data options, cascades, formulas, conditional required, OCR fill, payload.
- `src/store.jsx`: app state. `live` = signed in, otherwise sample data from `src/data.js`. `bumpLive()` refreshes live screens.
- `src/repo.js`: repository (Folders) client `repoApi`: browse tree, items query, metadata/delete, staged files (index list, save, export, delete), bulk upload jobs (tracked on the device per tenant). `docApi` (MOBILE_APP_REPOSITORY_API): intelligent upload (classify → OCR → stage → archive), AI summary + `parseSummary`, share / revoke / shared with me, sign requests and signing.
- `src/background.js` + `public/runners/inbox.js`: background inbox check with `@capacitor/background-runner` (Android WorkManager, about every 15 minutes, also while the app is closed). The app passes the session and the requests already shown; the runner posts a phone notification for new ones. No-op on the web and in the SDK-free test APK.
- `src/LiveWatcher.jsx`: auto-refresh poller (45 s while open, 2 min in the background). Adds new requests to in-app notifications and sends a phone notification.
- `src/notify.js`: phone notifications. Capacitor LocalNotifications, or the test-APK `prompt('ezofis:…')` bridge, or the Web Notification API.
- `src/screens/`:
  - `Home.jsx`: Home (LiveHome / SampleHome);
  - `LiveWorkflow.jsx`: inbox list, ticket detail, actions;
  - `NewRequest.jsx`: new request;
  - `FileViewer.jsx` + `OfficeViewers.jsx`: in-app viewers for pdf, image, eml, msg, docx, xlsx, pptx;
  - `LiveFolders.jsx`: Folders on the repository API (repositories, tree, files, upload with OCR progress, review & export); `Folders.jsx` keeps the sample screens;
  - `MetaForm.jsx`: repository metadata form from the field definitions (GET /repositories/{id}): typed controls, predefined / unique / master options with cascades, required, read-only, tables. Used by Edit details, Review & export and Intelligent upload;
  - `DocActions.jsx`: Share sheet, Request signatures sheet, signature status, To sign list (`/app/sign`), signing screen with signature pad (`/app/sign/:id`), intelligent upload, Shared with me;
  - `AskAiChat.jsx`: Ask EZOFIS AI chat (Repository Assistant API, `src/assistant.js`); `AskAi.jsx`: the Home Ask AI card and the sample-data sheet;
  - `More.jsx`: Notifications, Settings;
  - `Onboarding.jsx`: splash, login, 2FA.
- `apk-shell/`: hand-written DEX/manifest/arsc builder plus APK v2 signer, for test APKs without the Android SDK.
  - Classes: `MainActivity` (WebView) and `FileChooserClient`, which handles file upload (`onShowFileChooser`) and the notification bridge (`onJsPrompt`).
  - It is not the release path: release builds come from `android/` (Capacitor + Gradle).

## Rules that must hold
- **Credentials**
  - Never store, log or show `databaseName` / `connectionString` from sign-in or tenant responses.
  - Never hard-code or commit credentials, tokens or signing keys. `apk-shell/*.pem|*.keystore|*.der` are git-ignored.
- **This repo is public:** use only `@example.com`-style fake data in tests, fixtures and docs.
- **No live writes from tooling:** never call move-next, comments, uploads or start against production (cloud.ezofis.com) from tests or scripts. Writes are tested with the mocks in `tests/e2e/wfmock.py`.
- **Master-form rows:** these can include a plain-text `Password` column (backend issue). Keep only the columns the form references (`loadMaster`).
- **Social login:** send only a provider-verified email, never a typed one. The backend must verify the provider token before release.
- **Logos:** the sign-in buttons use the providers' own marks (Google "G", Microsoft four squares) in their official colours (`GoogleLogo` / `MicrosoftLogo` in `Onboarding.jsx`); don't restyle or recolour them.
- **Uploads:** max 20 MB per file (`MAX_FILE_MB`).
- **Hidden fields:** never show OCR text or tenant / instance / storage / repository IDs (`isTechnicalKey` / `isTechnicalLabel`).
- **Action buttons and tabs** are data-driven from the workflow JSON: rules `proceedAction` / `buttonColor` and `requestTabs` / `nodeIds`. Don't hard-code per-workflow labels.
- **Auto-refresh** must not reset forms or open tickets. It only refreshes `/app/home`, `/app/inbox` and `/app/notifications`; elsewhere it marks the data stale.

## UI conventions
- **Theme:** purple `#643094` / `#8300E6`, teal `#0A7C89`. Fonts: Poppins for body text, `var(--head)` for headings. Tokens are in `src/styles.css`.
- **Layout:**
  - Phones: bottom tabs.
  - 768 px and up: navigation rail.
  - 960 px and up: split view.
  - Test at 320, 390 and 1024 px wide.
- **Platform styles:** iOS and Android differ via `document.documentElement.dataset.platform`.
