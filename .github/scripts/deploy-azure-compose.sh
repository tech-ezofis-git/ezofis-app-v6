#!/usr/bin/env bash
# Way 2 (no ACR): pin only the service(s) that built this run to sha-<short>,
# keep other services on their current Azure tags, restart once per service,
# smoke-check before continuing.
set -euo pipefail

RG="${AZURE_RESOURCE_GROUP:-rg-v6}"
APP="${AZURE_WEBAPP_NAME:-ezofis-app-v6}"
SHORT_SHA="${GITHUB_SHA:0:7}"
IMAGE_APP="${IMAGE_APP:-ghcr.io/tech-ezofis-git/ezofis-app-v6/app}"
IMAGE_API="${IMAGE_API:-ghcr.io/tech-ezofis-git/ezofis-app-v6/api}"
IMAGE_AGENTS="${IMAGE_AGENTS:-ghcr.io/tech-ezofis-git/ezofis-app-v6/agents}"
SMOKE_BASE="${SMOKE_BASE_URL:-https://cloud.ezofis.com}"
SMOKE_ATTEMPTS="${SMOKE_ATTEMPTS:-20}"   # ~20 min at 60s
SMOKE_SLEEP_SEC="${SMOKE_SLEEP_SEC:-60}"
# JWT signing key comes only from the EZOFIS_SIGNING_KEY GitHub secret, never from
# a committed file. When it is empty, the key already set in Azure is left untouched.
EZOFIS_SIGNING_KEY="${EZOFIS_SIGNING_KEY:-}"

DEPLOY_APP="${DEPLOY_APP:-false}"
DEPLOY_API="${DEPLOY_API:-false}"
DEPLOY_AGENTS="${DEPLOY_AGENTS:-false}"

need_python() {
  python3 - "$@" <<'PY'
import base64, os, re, sys

raw = os.environ.get("COMPOSE_RAW", "")
if raw.startswith("COMPOSE|"):
    raw = raw[7:]
raw = raw.lstrip("\ufeff").strip()
try:
    txt = base64.b64decode(raw).decode("utf-8", errors="replace")
except Exception as e:
    print(f"decode-failed: {e}", file=sys.stderr)
    txt = ""

def tag_for(image_prefix: str) -> str:
    pat = re.compile(
        rf"^\s*image:\s*{re.escape(image_prefix)}:(\S+)\s*$",
        re.M,
    )
    m = pat.search(txt)
    return m.group(1) if m else "latest"

app_t = tag_for(os.environ["IMAGE_APP"])
api_t = tag_for(os.environ["IMAGE_API"])
agents_t = tag_for(os.environ["IMAGE_AGENTS"])
print(f"{app_t} {api_t} {agents_t}")
PY
}

write_compose() {
  local app_tag="$1" api_tag="$2" agents_tag="$3" out="$4"
  cat >"$out" <<EOF
version: "3.8"
services:
  app:
    image: ${IMAGE_APP}:${app_tag}
    ports:
      - "80:80"
    restart: always
  api:
    image: ${IMAGE_API}:${api_tag}
    restart: always
    stop_grace_period: 30s
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      HttpsRedirection__Enabled: "false"
      Swagger__Enabled: "true"
      Hangfire__RunServerInApi: "true"
      Hangfire__ServerName: v6-api
      Hangfire__ApiWorkerCount: "1"
  agents:
    image: ${IMAGE_AGENTS}:${agents_tag}
    restart: always
    environment:
      REDIS_URL: redis://redis:6379/0
      DATABASE_POOL_MIN_SIZE: "1"
      DATABASE_POOL_MAX_SIZE: "3"
      EZOFIS_API_BASE: http://app/api
      EZOFIS_ENV: live
    depends_on:
      - redis
  redis:
    image: public.ecr.aws/docker/library/redis:7-alpine
    restart: always
EOF
}

apply_compose() {
  local file="$1"
  echo "Applying compose:"
  grep 'image:' "$file" || true
  az webapp config container set \
    --name "$APP" \
    --resource-group "$RG" \
    --multicontainer-config-type compose \
    --multicontainer-config-file "$file" \
    --output none
}

restart_once() {
  echo "Applying runtime app settings + restart once..."
  local settings=(
    HttpsRedirection__Enabled=false
    Swagger__Enabled=true
    ASPNETCORE_ENVIRONMENT=Production
    Hangfire__RunServerInApi=true
    Hangfire__ServerName=v6-api
    Hangfire__ApiWorkerCount=1
    DEPLOY_SHA="$SHORT_SHA"
    DOCKER_ENABLE_CI=true
    EzofisAuth__Issuer=Ezofis
    EzofisAuth__Audience=Ezofis
  )
  if [[ -n "$EZOFIS_SIGNING_KEY" ]]; then
    if (( ${#EZOFIS_SIGNING_KEY} < 32 )); then
      echo "Error: EZOFIS_SIGNING_KEY secret is shorter than 32 characters; refusing to deploy it." >&2
      exit 1
    fi
    settings+=(EzofisAuth__SigningKey="$EZOFIS_SIGNING_KEY")
    echo "Setting EzofisAuth__SigningKey from the EZOFIS_SIGNING_KEY secret."
  else
    echo "EZOFIS_SIGNING_KEY secret not set; keeping the signing key already configured in Azure."
  fi
  az webapp config appsettings set \
    --resource-group "$RG" \
    --name "$APP" \
    --settings "${settings[@]}" \
    --output none
  az webapp restart --name "$APP" --resource-group "$RG" --output none
}

# Each argument is a path, optionally with accepted status codes: "/path=200|401".
# Without codes, only 200 counts as healthy.
smoke() {
  local paths=("$@")
  echo "Smoke check: ${paths[*]} (up to ${SMOKE_ATTEMPTS} x ${SMOKE_SLEEP_SEC}s)"
  local i code url p accepted
  for ((i = 1; i <= SMOKE_ATTEMPTS; i++)); do
    local ok=1
    local line=""
    for entry in "${paths[@]}"; do
      p="${entry%%=*}"
      accepted="200"
      [[ "$entry" == *=* ]] && accepted="${entry#*=}"
      url="${SMOKE_BASE}${p}"
      # Follow redirects: /swagger returns 301 -> /swagger/index.html
      code=$(curl -sL -o /dev/null -w "%{http_code}" --max-time 25 "$url" || echo "000")
      line+="${p}=${code} "
      if [[ "|${accepted}|" != *"|${code}|"* ]]; then
        ok=0
      fi
    done
    echo "[$i/${SMOKE_ATTEMPTS}] $line"
    if [[ "$ok" -eq 1 ]]; then
      echo "Smoke OK"
      return 0
    fi
    sleep "$SMOKE_SLEEP_SEC"
  done
  echo "Smoke FAILED after ${SMOKE_ATTEMPTS} attempts" >&2
  return 1
}

echo "Reading current Azure compose pins..."
COMPOSE_RAW="$(az webapp config container show \
  --name "$APP" \
  --resource-group "$RG" \
  --query "[?name=='DOCKER_CUSTOM_IMAGE_NAME'].value | [0]" \
  -o tsv || true)"
export COMPOSE_RAW IMAGE_APP IMAGE_API IMAGE_AGENTS
read -r CUR_APP CUR_API CUR_AGENTS <<<"$(need_python)"
echo "Current tags: app=${CUR_APP} api=${CUR_API} agents=${CUR_AGENTS}"

APP_TAG="$CUR_APP"
API_TAG="$CUR_API"
AGENTS_TAG="$CUR_AGENTS"
TMP="$(mktemp)"

# Deploy one service at a time so Azure only pulls that image.
if [[ "$DEPLOY_API" == "true" ]]; then
  API_TAG="sha-${SHORT_SHA}"
  echo "=== Deploy API -> ${IMAGE_API}:${API_TAG} ==="
  write_compose "$APP_TAG" "$API_TAG" "$AGENTS_TAG" "$TMP"
  apply_compose "$TMP"
  restart_once
  # /hangfire is answered by the API: 401 = password-protected, 404 = dashboard off.
  # A 5xx/000 still fails, so this keeps checking that the API is up.
  smoke / /swagger "/hangfire=200|401|404"
fi

if [[ "$DEPLOY_AGENTS" == "true" ]]; then
  AGENTS_TAG="sha-${SHORT_SHA}"
  echo "=== Deploy agents -> ${IMAGE_AGENTS}:${AGENTS_TAG} ==="
  write_compose "$APP_TAG" "$API_TAG" "$AGENTS_TAG" "$TMP"
  apply_compose "$TMP"
  restart_once
  smoke / /health /docs
fi

if [[ "$DEPLOY_APP" == "true" ]]; then
  APP_TAG="sha-${SHORT_SHA}"
  echo "=== Deploy app -> ${IMAGE_APP}:${APP_TAG} ==="
  write_compose "$APP_TAG" "$API_TAG" "$AGENTS_TAG" "$TMP"
  apply_compose "$TMP"
  restart_once
  smoke /
fi

echo "Final pins: app=${APP_TAG} api=${API_TAG} agents=${AGENTS_TAG}"
rm -f "$TMP"
