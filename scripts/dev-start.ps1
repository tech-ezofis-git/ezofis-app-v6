<#
.SYNOPSIS
  Start the EZOFIS V6 stack locally with auto-reload: web app (Vite), API (dotnet watch)
  and agents (Docker with uvicorn --reload). After `git pull`, each part reloads by itself.

.DESCRIPTION
  Before starting anything, checks the local settings so a laptop never talks to production:
  - app/.env must point VITE_BASE_URL / VITE_V6_BASE_URL at the local API, not cloud.ezofis.com
  - api/src/Api/appsettings.Development.json must not use the production Hangfire schema
  - agents/.env must point EZOFIS_API_BASE at the local API, not cloud.ezofis.com
  Each part opens in its own PowerShell window. Close a window to stop that part.

.EXAMPLE
  ./scripts/dev-start.ps1              # app + API + agents
  ./scripts/dev-start.ps1 -Only app,api
  ./scripts/dev-start.ps1 -DryRun      # checks only, starts nothing
#>
[CmdletBinding()]
param(
    [ValidateSet('app', 'api', 'agents')]
    [string[]]$Only = @('app', 'api', 'agents'),
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$ProductionHost = 'cloud.ezofis.com'
$Problems = New-Object System.Collections.Generic.List[string]

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

function Start-InWindow([string]$Title, [string]$Folder, [string]$Command) {
    $shell = 'powershell'
    if (Get-Command pwsh -ErrorAction SilentlyContinue) { $shell = 'pwsh' }
    $script = "`$Host.UI.RawUI.WindowTitle = '$Title'; Set-Location -LiteralPath '$Folder'; $Command"
    Start-Process -FilePath $shell -ArgumentList @('-NoExit', '-Command', $script) | Out-Null
}

if ($Only -contains 'app') { Test-App }
if ($Only -contains 'api') { Test-Api }
if ($Only -contains 'agents') { Test-Agents }

if ($Problems.Count -gt 0) {
    Write-Host "Not started. Fix these first:" -ForegroundColor Red
    foreach ($problem in $Problems) { Write-Host "  - $problem" -ForegroundColor Yellow }
    exit 1
}

Write-Host "Settings OK: nothing points at production." -ForegroundColor Green
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
Write-Host "Each part reloads by itself after a git pull. Run ./scripts/dev-pull.ps1 to update from testing."
