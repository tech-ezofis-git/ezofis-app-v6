<#
.SYNOPSIS
  Release ONE pull request from `testing` to production, without the rest of `testing`.

.DESCRIPTION
  Use this only when one PR on `testing` is ready and others aren't. Normally release all of
  `testing` with one PR `testing` -> `main`.

  1. Checks the PR was merged into `testing` and isn't in production (`main`) yet.
  2. Creates `release/<number>-<name>` from `origin/main` and copies only that PR onto it
     (git cherry-pick). Stops if it doesn't apply cleanly: the PR then depends on another
     PR that isn't live yet.
  3. Checks the branch changes exactly the PR's files.
  4. Runs the local checks for the parts it touches (API build + tests, web app type-check).
  5. Pushes the branch and opens the release PR into `main` from your account.
  6. Switches you back to the branch you were on.

  Afterwards: tech-ezofis-git approves and merges the release PR, and then a
  `main` -> `testing` sync PR keeps the branches in step (the script prints the command).

.EXAMPLE
  ./scripts/release-pr.ps1 -Pr 184
  ./scripts/release-pr.ps1 -Pr 184 -NoPush      # prepare and check only; push nothing
  ./scripts/release-pr.ps1 -Pr 184 -SkipTests
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [int]$Pr,
    [string]$Repo = 'tech-ezofis-git/ezofis-app-v6',
    [switch]$NoPush,
    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot

function Invoke-Native([string]$Exe, [string[]]$Arguments) {
    # Windows PowerShell 5.1 turns redirected native stderr into errors; collect it as text instead.
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $output = & $Exe @Arguments 2>&1 | ForEach-Object { "$_" }
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previous
    return [pscustomobject]@{ Output = $output; ExitCode = $exitCode }
}

function Invoke-Git([string[]]$Arguments, [switch]$AllowFailure) {
    $result = Invoke-Native 'git' (@('-C', $Root) + $Arguments)
    if ($result.ExitCode -ne 0 -and -not $AllowFailure) {
        throw "git $($Arguments -join ' ') failed:`n$($result.Output -join "`n")"
    }
    return $result
}

function Stop-Release([string]$Message) {
    Write-Host $Message -ForegroundColor Red
    exit 1
}

foreach ($tool in 'git', 'gh') {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) { Stop-Release "$tool is not installed." }
}

# The release PR must come from your own account: tech-ezofis-git can't approve its own PR.
$auth = Invoke-Native 'gh' @('auth', 'status')
$activeLine = @($auth.Output | Select-String -Pattern 'account (\S+)' -Context 0, 1 | Where-Object { $_.Context.PostContext -match 'Active account: true' })
$account = if ($activeLine) { $activeLine[0].Matches[0].Groups[1].Value } else { '' }
if ($account -eq 'tech-ezofis-git') {
    Stop-Release "gh is signed in as tech-ezofis-git. Switch to your own account first: gh auth switch -h github.com -u <your-account>"
}

# Same rule as dev-pull: only files the dev server regenerates may be dirty.
$generatedFiles = @('app/src/routeTree.gen.ts', 'app/tsconfig.tsbuildinfo')
$dirty = @((Invoke-Git @('status', '--porcelain', '--untracked-files=no')).Output | Where-Object { $_ } | ForEach-Object { $_.Substring(3).Trim('"') })
$ownChanges = @($dirty | Where-Object { $generatedFiles -notcontains $_ -and $_ -notmatch '^app/src/locales/.+/messages\.(po|ts)$' })
if ($ownChanges.Count -gt 0) {
    Stop-Release ("You have uncommitted changes. Commit or stash them first:`n  " + ($ownChanges -join "`n  "))
}
if ($dirty.Count -gt 0) { Invoke-Git (@('checkout', '--') + $dirty) | Out-Null }

# --- The PR ------------------------------------------------------------------
$view = Invoke-Native 'gh' @('pr', 'view', "$Pr", '--repo', $Repo, '--json', 'state,baseRefName,headRefName,title,mergeCommit,files')
if ($view.ExitCode -ne 0) { Stop-Release "PR #$Pr not found in ${Repo}:`n$($view.Output -join "`n")" }
$info = ($view.Output -join "`n") | ConvertFrom-Json
if ($info.state -ne 'MERGED') { Stop-Release "PR #$Pr is $($info.state), not merged. Merge it into testing first." }
if ($info.baseRefName -ne 'testing') { Stop-Release "PR #$Pr was merged into '$($info.baseRefName)', not 'testing'. This script only releases PRs from testing." }
$mergeSha = $info.mergeCommit.oid
$prFiles = @($info.files | ForEach-Object { $_.path } | Sort-Object)
Write-Host "PR #${Pr}: $($info.title)" -ForegroundColor Cyan
Write-Host "  merged into testing as $($mergeSha.Substring(0, 8)), $($prFiles.Count) files"

Invoke-Git @('fetch', '-q', 'origin') | Out-Null
if ((Invoke-Git @('merge-base', '--is-ancestor', $mergeSha, 'origin/main') -AllowFailure).ExitCode -eq 0) {
    Stop-Release "PR #$Pr is already in production (main contains it). Nothing to do."
}

$slug = ($info.headRefName -replace '^[^/]+/', '' -replace '[^A-Za-z0-9-]+', '-').Trim('-').ToLower()
if ($slug.Length -gt 40) { $slug = $slug.Substring(0, 40).Trim('-') }
$branch = "release/$Pr-$slug"
if ((Invoke-Git @('rev-parse', '--verify', '-q', "refs/heads/$branch") -AllowFailure).ExitCode -eq 0 -or
    (Invoke-Git @('ls-remote', '--exit-code', '--heads', 'origin', $branch) -AllowFailure).ExitCode -eq 0) {
    Stop-Release "Branch $branch already exists (locally or on GitHub). A release PR for #$Pr may already be open: gh pr list --repo $Repo --head $branch"
}

# A merge commit needs -m 1 (copy the PR's side only); a squash-merged PR is a normal commit.
$parents = @(((Invoke-Git @('rev-list', '--parents', '-n', '1', $mergeSha)).Output -join ' ').Split(' ') | Where-Object { $_ }).Count - 1
$pickArgs = @('cherry-pick', '-x')
if ($parents -gt 1) { $pickArgs += @('-m', '1') }
$pickArgs += $mergeSha

$startBranch = ((Invoke-Git @('rev-parse', '--abbrev-ref', 'HEAD')).Output -join '').Trim()
$keepBranch = $false
try {
    Invoke-Git @('switch', '-q', '-c', $branch, 'origin/main') | Out-Null
    $pick = Invoke-Git $pickArgs -AllowFailure
    if ($pick.ExitCode -ne 0 -and ($pick.Output -join "`n") -match 'cherry-pick is now empty|nothing to commit') {
        # Same changes are already on main, e.g. released earlier with this script.
        Invoke-Git @('cherry-pick', '--abort') -AllowFailure | Out-Null
        Stop-Release "PR #$Pr's changes are already in production (released earlier as a copy). Nothing to do."
    }
    if ($pick.ExitCode -ne 0) {
        Invoke-Git @('cherry-pick', '--abort') -AllowFailure | Out-Null
        $conflicts = @($pick.Output | Select-String -Pattern 'CONFLICT' | ForEach-Object { "  $($_.Line.Trim())" })
        Stop-Release ("PR #$Pr doesn't apply cleanly on production: it depends on changes that aren't live yet.`n" +
            ($conflicts -join "`n") + "`nRelease it together with those PRs (normal testing -> main release), or wait.")
    }

    # Exactly the PR's files, nothing else.
    $branchFiles = @((Invoke-Git @('diff', '--name-only', 'origin/main', 'HEAD')).Output | Where-Object { $_ } | Sort-Object)
    $extra = @($branchFiles | Where-Object { $prFiles -notcontains $_ })
    $missing = @($prFiles | Where-Object { $branchFiles -notcontains $_ })
    if ($extra.Count -gt 0 -or $missing.Count -gt 0) {
        Stop-Release ("The copied changes don't match PR #$Pr's files.`n  Extra: " + ($extra -join ', ') + "`n  Missing: " + ($missing -join ', '))
    }
    Write-Host "  copied onto $branch from main: exactly the PR's $($branchFiles.Count) files" -ForegroundColor Green

    if (-not $SkipTests) {
        if ($branchFiles | Where-Object { $_ -like 'api/*' }) {
            Write-Host "API changed: building and testing..." -ForegroundColor Cyan
            $build = Invoke-Native 'dotnet' @('build', (Join-Path $Root 'api/SaaSApp.sln'), '-c', 'Release', '-v', 'q', '-nologo')
            if ($build.ExitCode -ne 0) { Stop-Release ("API build failed:`n" + (($build.Output | Select-String 'error') -join "`n")) }
            $test = Invoke-Native 'dotnet' @('test', (Join-Path $Root 'api/SaaSApp.sln'), '-c', 'Release', '--no-build', '-nologo')
            $test.Output | Select-String -Pattern 'Passed!|Failed!' | ForEach-Object { Write-Host "  $($_.Line.Trim())" }
            if ($test.ExitCode -ne 0) { Stop-Release "API tests failed. Fix them on testing first." }
        }
        if ($branchFiles | Where-Object { $_ -like 'app/*' }) {
            if (Test-Path -LiteralPath (Join-Path $Root 'app/node_modules')) {
                Write-Host "Web app changed: type-checking..." -ForegroundColor Cyan
                Push-Location (Join-Path $Root 'app')
                try { $tsc = Invoke-Native 'npx' @('tsc', '-b') } finally { Pop-Location }
                if ($tsc.ExitCode -ne 0) { Stop-Release ("Web app type-check failed:`n" + (($tsc.Output | Select-Object -First 15) -join "`n")) }
            }
            else {
                Write-Host "Web app changed: node_modules missing, skipping the local type-check (PR checks still run it)." -ForegroundColor Yellow
            }
        }
        if ($branchFiles | Where-Object { $_ -like 'agents/*' }) {
            Write-Host "Agents changed: the PR checks run pytest on GitHub (not run locally)." -ForegroundColor Yellow
        }
    }

    if ($branchFiles | Where-Object { $_ -like '.github/workflows/*' }) {
        Write-Host "Note: this PR changes .github/workflows. Pushing it needs the 'workflow' permission: gh auth refresh -h github.com -s workflow" -ForegroundColor Yellow
    }

    if ($NoPush) {
        Write-Host "Dry run (-NoPush): branch $branch is ready locally; nothing was pushed or opened." -ForegroundColor Green
        Write-Host "  Delete it with: git branch -D $branch"
        $keepBranch = $true
        return
    }

    $push = Invoke-Git @('push', '-q', '-u', 'origin', $branch) -AllowFailure
    if ($push.ExitCode -ne 0) { Stop-Release ("Push failed:`n" + ($push.Output -join "`n")) }

    $body = @"
## Why
Releases **only** #$Pr (*$($info.title)*) to production. The rest of ``testing`` stays where it is.

Made with ``scripts/release-pr.ps1``: a branch from ``main``, with #$Pr's merge commit copied onto it (``git cherry-pick -x $($mergeSha.Substring(0, 8))``). Because the head isn't ``testing``, the bot adds ``direct to main``. That's expected.

## Checked
- Changes exactly #$Pr's $($branchFiles.Count) files.
- Local checks: $(if ($SkipTests) { 'skipped (-SkipTests)' } else { 'API build + tests / web app type-check, for the parts it touches' }).

## Next
1. tech-ezofis-git: **Approve** on the final commit, then **Merge**.
2. Afterwards, sync ``main`` into ``testing``: ``gh pr create --repo $Repo --base testing --head main --title "Sync main into testing"``
"@
    $create = Invoke-Native 'gh' @('pr', 'create', '--repo', $Repo, '--base', 'main', '--head', $branch,
        '--reviewer', 'tech-ezofis-git', '--title', "Release: $($info.title) (#$Pr)", '--body', $body)
    if ($create.ExitCode -ne 0) { Stop-Release ("The branch is pushed, but opening the PR failed:`n" + ($create.Output -join "`n")) }
    $url = ($create.Output | Where-Object { $_ -match '^https://' } | Select-Object -Last 1)
    $keepBranch = $true

    Write-Host ""
    Write-Host "Release PR opened: $url" -ForegroundColor Green
    Write-Host "Next:"
    Write-Host "  1. Wait for its checks to pass."
    Write-Host "  2. tech-ezofis-git: Approve, then Merge pull request, then Confirm merge."
    Write-Host "  3. Then sync main into testing:"
    Write-Host "     gh pr create --repo $Repo --base testing --head main --title ""Sync main into testing"""
}
finally {
    $current = ((Invoke-Git @('rev-parse', '--abbrev-ref', 'HEAD') -AllowFailure).Output -join '').Trim()
    if ($current -ne $startBranch) { Invoke-Git @('switch', '-q', $startBranch) -AllowFailure | Out-Null }
    if (-not $keepBranch) { Invoke-Git @('branch', '-D', $branch) -AllowFailure | Out-Null }
}
