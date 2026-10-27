#!/usr/bin/env bash
# Mock end-to-end checks for the mobile app (no live server calls).
# Needs: python3, playwright (pip install playwright && playwright install chromium).
set -e
cd "$(dirname "$0")/../.."
SINGLE=1 npx vite build >/dev/null
for t in tests/e2e/test_flow*.py; do echo "== $t"; python3 "$t"; done
