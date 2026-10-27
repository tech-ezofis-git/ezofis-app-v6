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
Before a test APK, bump `versionCode` / `versionName` in `apk-shell/build_apk.py` (`manifest_xml`). The current version is 19 / 0.4.4.

## Code map
- `src/api.js`: sign-in (`loggedFrom: "MOBILE"`, 2FA, tenants), session storage, `authed()` (Bearer + `X-Tenant-Id`). A 401 dispatches `SESSION_EXPIRED`, which sends the user back to login.
- `src/wf.js`: Workflow API client `wfApi`. Also:
  - meta and form cache (`getMeta`, `getForm`);
  - `toCard`, `formView`, `actionsFor` (rules: `proceedAction`, `buttonColor`);
  - `tabsFor` (`settings.general.requestTabs`), line items, hidden technical fields, `canStart`.
- `src/formEngine.js`: New-request form with web-form parity: defaults, master-data options, cascades, formulas, conditional required, OCR fill, payload.
- `src/store.jsx`: app state. `live` = signed in, otherwise sample data from `src/data.js`. `bumpLive()` refreshes live screens.
- `src/LiveWatcher.jsx`: auto-refresh poller (45 s while open, 2 min in the background). Adds new requests to in-app notifications and sends a phone notification.
- `src/notify.js`: phone notifications. Capacitor LocalNotifications, or the test-APK `prompt('ezofis:…')` bridge, or the Web Notification API.
- `src/screens/`:
  - `Home.jsx`: Home (LiveHome / SampleHome);
  - `LiveWorkflow.jsx`: inbox list, ticket detail, actions;
  - `NewRequest.jsx`: new request;
  - `FileViewer.jsx` + `OfficeViewers.jsx`: in-app viewers for pdf, image, eml, msg, docx, xlsx, pptx;
  - `AskAi.jsx`: Ask AI;
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
- **Logos:** don't draw Google or Microsoft logos.
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
