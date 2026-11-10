<#
.SYNOPSIS
  Start the EZOFIS V6 stack locally with auto-reload: web app (Vite), API (dotnet watch)
  and agents (Docker with uvicorn --reload). The mobile app (Vite) starts with -Only ...,mobile.
  After `git pull`, each part reloads by itself.

.DESCRIPTION
  Before starting anything, checks the local settings so a laptop never talks to production:
  - app/.env must point VITE_BASE_URL / VITE_V6_BASE_URL at the local API, not cloud.ezofis.com
  - api/src/Api/appsettings.Development.json must not use the production Hangfire schema
  - agents/.env must point EZOFIS_API_BASE at the local API, not cloud.ezofis.com
  - mobile/.env.development.local (only with -Only ...,mobile) must point VITE_API_BASE and
    VITE_API_PROXY_TARGET at the local API, not cloud.ezofis.com
  - required values (database login, UAT login) must not still be REPLACE_ME / YOUR_... placeholders;
    optional ones (LLM keys, file storage) only produce a warning
  Each part opens in its own PowerShell window. Close a window to stop that part.

.EXAMPLE
  ./scripts/dev-start.ps1              # app + API + agents
  ./scripts/dev-start.ps1 -Only app,api
  ./scripts/dev-start.ps1 -Only api,mobile   # mobile app against the local API
  ./scripts/dev-start.ps1 -Only app,api,agents,mobile
  ./scripts/dev-start.ps1 -DryRun      # checks only, starts nothing
#>
[CmdletBinding()]
param(
    # mobile is not in the default list, so web-only developers don't need mobile settings.
    [ValidateSet('app', 'api', 'agents', 'mobile')]
    [string[]]$Only = @('app', 'api', 'agents'),
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$ProductionHost = 'cloud.ezofis.com'
$Problems = New-Object System.Collections.Generic.List[string]
$Warnings = New-Object System.Collections.Generic.List[string]

function Test-Placeholder([string]$Value) {
    return $Value -match 'REPLACE_ME|YOUR_[A-Z_]+'
}

function Read-EnvFile([string]$Path) {
    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
            $values[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
        }
    }
    return $values
}

function Test-App {
    $envPath = Join-Path $Root 'app/.env'
    if (-not (Test-Path -LiteralPath $envPath)) {
        $Problems.Add("app/.env is missing. Copy app/.env.example to app/.env and set VITE_BASE_URL and VITE_V6_BASE_URL to http://localhost:5000/api.")
        return
    }
    $values = Read-EnvFile $envPath
    foreach ($key in 'VITE_BASE_URL', 'VITE_V6_BASE_URL') {
        $value = $values[$key]
        if (-not $value) {
            $Problems.Add("app/.env: $key is empty. Set it to http://localhost:5000/api.")
        }
        elseif ($value -like "*$ProductionHost*") {
            $Problems.Add("app/.env: $key points at production ($value). Set it to http://localhost:5000/api.")
        }
    }
}

function Test-Api {
    $settingsPath = Join-Path $Root 'api/src/Api/appsettings.Development.json'
    if (-not (Test-Path -LiteralPath $settingsPath)) {
        $Problems.Add("api/src/Api/appsettings.Development.json is missing. Copy appsettings.example.json and fill in the tester database login.")
        return
    }
    try {
        $settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
    }
    catch {
        $Problems.Add("api/src/Api/appsettings.Development.json is not valid JSON: $($_.Exception.Message)")
        return
    }
    $connection = $null
    if ($settings.ConnectionStrings) { $connection = $settings.ConnectionStrings.DefaultConnection }
    if (-not $connection -or (Test-Placeholder $connection)) {
        $Problems.Add("appsettings.Development.json: ConnectionStrings.DefaultConnection still has a placeholder. Fill in the tester database login.")
    }
    $blob = $null
    if ($settings.EzofisBlobStorage) { $blob = $settings.EzofisBlobStorage.ConnectionString }
    if ($blob -and (Test-Placeholder $blob)) {
        $Problems.Add("appsettings.Development.json: EzofisBlobStorage.ConnectionString is a placeholder, which makes every request fail. Set it to """" (no file storage) or to a TEST storage connection string.")
    }
    elseif (-not $blob) {
        $Warnings.Add("File storage is off (EzofisBlobStorage.ConnectionString is empty): uploads and document previews won't work.")
    }
    $schema = $null
    if ($settings.Hangfire) { $schema = $settings.Hangfire.SchemaName }
    if ($schema -eq 'hangfire') {
        $Problems.Add("appsettings.Development.json: Hangfire.SchemaName is 'hangfire', production's job queue. Use 'hangfire_local' or remove it.")
    }
    if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
        $Problems.Add("dotnet is not installed. Install the .NET 8 SDK.")
    }
}

function Test-Agents {
    $envPath = Join-Path $Root 'agents/.env'
    if (-not (Test-Path -LiteralPath $envPath)) {
        $Problems.Add("agents/.env is missing. Create it and set EZOFIS_API_BASE=http://host.docker.internal:5000/api.")
        return
    }
    $values = Read-EnvFile $envPath
    $apiBase = $values['EZOFIS_API_BASE']
    if (-not $apiBase) {
        $Problems.Add("agents/.env: EZOFIS_API_BASE is not set, so the agents default to production. Set it to http://host.docker.internal:5000/api.")
    }
    elseif ($apiBase -like "*$ProductionHost*") {
        $Problems.Add("agents/.env: EZOFIS_API_BASE points at production ($apiBase). Set it to http://host.docker.internal:5000/api.")
    }
    foreach ($key in 'CATALOG_DATABASE_URL', 'EZOFIS_LOGIN_EMAIL', 'EZOFIS_LOGIN_PASSWORD') {
        if ($values[$key] -and (Test-Placeholder $values[$key])) {
            $Problems.Add("agents/.env: $key still has a placeholder. Fill it in.")
        }
    }
    if ($values['EZOFIS_ENV'] -eq 'live') {
        $Problems.Add("agents/.env: EZOFIS_ENV is 'live', which makes the AP pipeline take real final actions. Use 'trial' locally.")
    }
    $missingKeys = @($values.Keys | Where-Object { $_ -like '*_API_KEY' -and (Test-Placeholder $values[$_]) } | Sort-Object)
    if ($missingKeys.Count -gt 0) {
        $Warnings.Add("agents/.env: $($missingKeys -join ', ') not filled in yet: AI features that use them won't work.")
    }
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        $Problems.Add("docker is not installed. Install Docker Desktop.")
        return
    }
    # Windows PowerShell 5.1 turns redirected native stderr into errors; don't let that stop the script.
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & docker info *> $null
    $dockerRunning = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $previous
    if (-not $dockerRunning) {
        $Problems.Add("Docker is not running. Start Docker Desktop and try again.")
    }
}

function Test-Mobile {
    $envPath = Join-Path $Root 'mobile/.env.development.local'
    $fix = "Copy mobile/.env.development.example to mobile/.env.development.local (VITE_API_BASE=/api, VITE_API_PROXY_TARGET=http://localhost:5000)."
    if (-not (Test-Path -LiteralPath $envPath)) {
        $Problems.Add("mobile/.env.development.local is missing, so the mobile app would call production. $fix")
        return
    }
    $values = Read-EnvFile $envPath
    # In dev mode Vite also reads these files (lower priority, highest first). A key the local file
    # leaves out can still come from one of them, so check what Vite will really use.
    foreach ($other in 'mobile/.env.development', 'mobile/.env.local', 'mobile/.env') {
        $otherPath = Join-Path $Root $other
        if (Test-Path -LiteralPath $otherPath) {
            $otherValues = Read-EnvFile $otherPath
            foreach ($key in $otherValues.Keys) {
                if (-not $values.ContainsKey($key)) { $values[$key] = $otherValues[$key] }
            }
        }
    }
    $apiBase = $values['VITE_API_BASE']
    if (-not $apiBase) {
        $Problems.Add("mobile/.env.development.local: VITE_API_BASE is not set, so the mobile app defaults to production. Set it to /api.")
    }
    elseif ($apiBase -like "*$ProductionHost*") {
        $Problems.Add("mobile/.env.development.local: VITE_API_BASE points at production ($apiBase). Set it to /api.")
    }
    $target = $values['VITE_API_PROXY_TARGET']
    if ($apiBase -and $apiBase.StartsWith('/')) {
        if (-not $target) {
            $Problems.Add("mobile/.env.development.local: VITE_API_PROXY_TARGET is not set, so /api has nowhere to go. Set it to http://localhost:5000.")
        }
        elseif ($target -like "*$ProductionHost*") {
            $Problems.Add("mobile/.env.development.local: VITE_API_PROXY_TARGET points at production ($target). Set it to http://localhost:5000.")
        }
    }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        $Problems.Add("npm is not installed. Install Node.js 20 or later.")
    }
    if ($Only -notcontains 'api') {
        $Warnings.Add("The mobile app needs the local API on http://localhost:5000. Start it too (-Only api,mobile) unless it is already running.")
    }
}

function Start-InWindow([string]$Title, [string]$Folder, [string]$Command) {
    $shell = 'powershell'
    if (Get-Command pwsh -ErrorAction SilentlyContinue) { $shell = 'pwsh' }
    $script = "`$Host.UI.RawUI.WindowTitle = '$Title'; Set-Location -LiteralPath '$Folder'; $Command"
    Start-Process -FilePath $shell -ArgumentList @('-NoExit', '-Command', $script) | Out-Null
}

if ($Only -contains 'app') { Test-App }
if ($Only -contains 'api') { Test-Api }
if ($Only -contains 'agents') { Test-Agents }
if ($Only -contains 'mobile') { Test-Mobile }

if ($Problems.Count -gt 0) {
    Write-Host "Not started. Fix these first:" -ForegroundColor Red
    foreach ($problem in $Problems) { Write-Host "  - $problem" -ForegroundColor Yellow }
    exit 1
}

Write-Host "Settings OK: nothing points at production." -ForegroundColor Green
foreach ($warning in $Warnings) { Write-Host "  Note: $warning" -ForegroundColor Yellow }
if ($DryRun) {
    Write-Host "Dry run: would start $($Only -join ', ')."
    exit 0
}

if ($Only -contains 'api') {
    Start-InWindow 'EZOFIS API' (Join-Path $Root 'api/src/Api') 'dotnet watch run'
    Write-Host "API      -> http://localhost:5000/swagger  (check the log shows: Hangfire storage schema: hangfire_local)"
}
if ($Only -contains 'agents') {
    Start-InWindow 'EZOFIS agents' (Join-Path $Root 'agents') 'docker compose up; docker compose stop'
    Write-Host "Agents   -> http://localhost:8010/health"
}
if ($Only -contains 'app') {
    $appFolder = Join-Path $Root 'app'
    $appCommand = 'npm run dev'
    if (-not (Test-Path -LiteralPath (Join-Path $appFolder 'node_modules'))) { $appCommand = 'npm ci; npm run dev' }
    Start-InWindow 'EZOFIS web app' $appFolder $appCommand
    Write-Host "Web app  -> http://localhost:3000"
}
if ($Only -contains 'mobile') {
    $mobileFolder = Join-Path $Root 'mobile'
    $mobileCommand = 'npm run dev'
    if (-not (Test-Path -LiteralPath (Join-Path $mobileFolder 'node_modules'))) { $mobileCommand = 'npm ci; npm run dev' }
    Start-InWindow 'EZOFIS mobile app' $mobileFolder $mobileCommand
    Write-Host "Mobile   -> http://localhost:5173  (use a phone-sized window, for example DevTools device mode)"
}
Write-Host "Each part reloads by itself after a git pull. Run ./scripts/dev-pull.ps1 to update from testing."
