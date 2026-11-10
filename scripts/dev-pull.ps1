<#
.SYNOPSIS
  Update your local copy to the latest `testing` and do only the extra steps the new
  changes need. Running dev servers (scripts/dev-start.ps1) reload code changes by themselves.

.DESCRIPTION
  1. Stops if you have uncommitted changes (commit or stash them first). Files the dev server
     regenerates (routeTree.gen.ts, tsconfig.tsbuildinfo, locale messages) are reset instead.
  2. Switches to `testing` and pulls it (fast-forward only).
  3. Lists the PRs/commits that came in.
  4. Looks at which files changed and:
     - app/package-lock.json: runs `npm ci` if the web app isn't running, otherwise tells you to
       stop it first (npm ci can't replace files a running dev server holds open on Windows)
     - mobile/package-lock.json: same as the web app, for the mobile app (port 5173)
     - agents/requirements.txt or agents/Dockerfile: rebuilds the agents container
     - api/**/*.csproj: dotnet watch restarts by itself; tells you to restart it if it shows errors
     - api/scripts/postgres or schema-ensuring code: warns, because the first request
       changes tables in the shared database

.EXAMPLE
  ./scripts/dev-pull.ps1
#>
[CmdletBinding()]
param(
    [string]$Branch = 'testing'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

function Invoke-Git {
    # git writes normal messages ("Switched to branch ...") to stderr. Windows PowerShell 5.1
    # turns redirected stderr into errors, so collect it as text and check the exit code instead.
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & git -C $Root @args 2>&1 | ForEach-Object { "$_" }
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previous
    if ($exitCode -ne 0) { throw "git $($args -join ' ') failed:`n$($output -join "`n")" }
    return $output
}

function Test-PortListening([int]$Port) {
    try {
        return [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop)
    }
    catch {
        return $false
    }
}

# Files the running dev servers regenerate (often only line endings change). They don't count
# as your changes: they're reset to the committed version and regenerated after the pull.
$generatedFiles = @(
    'app/src/routeTree.gen.ts',
    'app/tsconfig.tsbuildinfo',
    'app/src/locales/ar/messages.po', 'app/src/locales/ar/messages.ts',
    'app/src/locales/en/messages.po', 'app/src/locales/en/messages.ts',
    'app/src/locales/fr/messages.po', 'app/src/locales/fr/messages.ts',
    'app/src/locales/ms/messages.po', 'app/src/locales/ms/messages.ts'
)
$dirtyFiles = @(Invoke-Git status --porcelain --untracked-files=no | ForEach-Object { $_.Substring(3).Trim('"') })
$ownChanges = @($dirtyFiles | Where-Object { $generatedFiles -notcontains $_ })
if ($ownChanges.Count -gt 0) {
    Write-Host "You have uncommitted changes. Commit or stash them first:" -ForegroundColor Red
    $ownChanges | ForEach-Object { Write-Host "  $_" }
    exit 1
}
if ($dirtyFiles.Count -gt 0) {
    Write-Host "Resetting files the dev server regenerated: $($dirtyFiles -join ', ')"
    Invoke-Git checkout -- @dirtyFiles | Out-Null
}

$current = (Invoke-Git rev-parse --abbrev-ref HEAD | Out-String).Trim()
if ($current -ne $Branch) {
    Write-Host "Switching from $current to $Branch"
    Invoke-Git switch $Branch | Out-Null
}

$before = (Invoke-Git rev-parse HEAD | Out-String).Trim()
Invoke-Git pull --ff-only origin $Branch | Out-Null
$after = (Invoke-Git rev-parse HEAD | Out-String).Trim()

if ($before -eq $after) {
    Write-Host "$Branch is already up to date." -ForegroundColor Green
    exit 0
}

Write-Host "New on ${Branch}:" -ForegroundColor Cyan
$newCommits = @(Invoke-Git log --oneline --first-parent "$before..$after")
$newCommits | Select-Object -First 20 | ForEach-Object { Write-Host "  $_" }
if ($newCommits.Count -gt 20) { Write-Host "  ... and $($newCommits.Count - 20) more" }

$changed = @(Invoke-Git diff --name-only $before $after)
$todo = New-Object System.Collections.Generic.List[string]

if ($changed -contains 'app/package-lock.json') {
    if (Test-PortListening 3000) {
        $todo.Add("Web app packages changed: close the 'EZOFIS web app' window, run 'npm ci' in app/, then run ./scripts/dev-start.ps1 -Only app.")
    }
    else {
        Write-Host "Web app packages changed: running npm ci..." -ForegroundColor Cyan
        Push-Location (Join-Path $Root 'app')
        try {
            & npm ci --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
        }
        finally {
            Pop-Location
        }
    }
}

if ($changed -contains 'mobile/package-lock.json' -and (Test-Path -LiteralPath (Join-Path $Root 'mobile/node_modules'))) {
    if (Test-PortListening 5173) {
        $todo.Add("Mobile app packages changed: close the 'EZOFIS mobile app' window, run 'npm ci' in mobile/, then run ./scripts/dev-start.ps1 -Only mobile.")
    }
    else {
        Write-Host "Mobile app packages changed: running npm ci..." -ForegroundColor Cyan
        Push-Location (Join-Path $Root 'mobile')
        try {
            & npm ci --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
        }
        finally {
            Pop-Location
        }
    }
}

if ($changed | Where-Object { $_ -eq 'agents/requirements.txt' -or $_ -eq 'agents/Dockerfile' }) {
    Write-Host "Agents packages changed: rebuilding the agents container..." -ForegroundColor Cyan
    Push-Location (Join-Path $Root 'agents')
    try {
        & docker compose up -d --build app
        if ($LASTEXITCODE -ne 0) { throw "docker compose up --build failed" }
    }
    finally {
        Pop-Location
    }
}

if ($changed | Where-Object { $_ -match '^api/.*\.(csproj|props)$' }) {
    $todo.Add("API project files changed: dotnet watch restarts by itself. If its window shows build errors, close it and run ./scripts/dev-start.ps1 -Only api.")
}

if ($changed | Where-Object { $_ -like 'api/scripts/postgres/*' -or $_ -like '*SchemaEnsuring*' -or $_ -like '*TenantSchemaEnsureHelper*' }) {
    $todo.Add("Database schema code changed. The first request to your local API will change tables in the SHARED database (catalog and the test tenant). Check with the team before testing this.")
}

Write-Host "Updated $Branch ($($before.Substring(0, 8)) -> $($after.Substring(0, 8))). Running dev servers reload by themselves." -ForegroundColor Green
if ($todo.Count -gt 0) {
    Write-Host "Also do this:" -ForegroundColor Yellow
    foreach ($item in $todo) { Write-Host "  - $item" -ForegroundColor Yellow }
}
