---
name: ezofis-mobile-dev
description: Build, test and ship the EZOFIS V6 mobile app in mobile/ — mock end-to-end checks, test APK builds, version bumps and Workflow API changes. Use for any change to mobile/.
---

# EZOFIS mobile: build, test, ship

Work from `mobile/`. Read `CLAUDE.md` (the rules) and `docs/HANDOFF.md` (status) first.

## Making a change
1. Find the code with `CLAUDE.md` → Code map. API calls go in `src/wf.js` (`wfApi`), form logic in `src/formEngine.js`, screens in `src/screens/`.
2. Workflow-specific behaviour must come from the workflow JSON, not hard-coded names:
   - tabs from `settings.general.requestTabs`;
   - buttons from `rules[].proceedAction` and `buttonColor`;
   - form behaviour from the field `settings`.
3. Keep the mock in step: when you use a new endpoint or field, add it to `tests/e2e/wfmock.py`, keeping the live response shape and using fake `@example.com` data.

## Checking a change
1. `SINGLE=1 npx vite build`
2. Run the relevant `tests/e2e/test_flow*.py`, or `tests/e2e/run_all.sh` for everything. Each prints booleans and `errors []`; any page error or `False` where you expected `True` needs fixing.
3. For UI changes, look at the screenshots in `tests/e2e/shots/` at 390 px, and at 320 px and 1024 px when layout is involved. Copy an existing test as a starting point. Tests set `localStorage['ezofis.session']` to a fake session and route `https://cloud.ezofis.com/**` to the mock.
4. To test auto-refresh quickly, set `localStorage['ezofis.pollMs']='2000'`, then reload the page; the value is read once when the app loads.
5. Never point tests or scripts at production for writes (move-next, comments, uploads, start).

## Building a test APK
1. Bump `versionCode` / `versionName` in `apk-shell/build_apk.py` → `manifest_xml`.
2. `SINGLE=1 npx vite build`
3. `python3 apk-shell/build_apk.py dist-single/index.html apk-shell/ic_launcher.png /tmp/u.apk`
4. `python3 apk-shell/sign_v2.py /tmp/u.apk EZOFIS-Mobile-vX.Y.Z-test.apk apk-shell`. A throwaway key is created on the first run and is git-ignored.
5. Check it with androguard (`APK(...).get_androidversion_name()`, `is_signed_v2()`).
6. If you change the native code (`build_dex`), disassemble `onJsPrompt` / `onShowFileChooser` with androguard and read the bytecode. Verifier errors only show up on a device.

APK files are git-ignored. Share them as files, not commits. Release builds use `npm run build && npx cap sync android`, then Gradle with a real key.

## Shipping
- Commit on a branch (`mobile/<topic>`), push, and open a PR into `main`. Don't push to `main` unless the user asks.
- Update `docs/HANDOFF.md`: the version row and the open items.
- If endpoints change, update `docs/workflow-api-integration.md`.
- This repo is public: no real emails, phone numbers, tenant data, tokens or keys in commits.
