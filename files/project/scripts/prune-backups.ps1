param(
  [string]$Root = ".",
  [switch]$DeletePermanently,
  [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$rootFull = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\')
$runStamp = (Get-Date -Format "yyyyMMdd_HHmmss")

# Decide archive base intelligently:
# - If Root is already ...\files\project  => archive under .\_archive\backups_pruned
# - Else if Root contains files\project   => archive under .\files\project\_archive\backups_pruned
# - Else                                  => archive under .\_archive\backups_pruned
$rootIsFilesProject = ($rootFull -match '\\files\\project$')

if ($rootIsFilesProject) {
  $archiveBase = Join-Path $rootFull "_archive\backups_pruned"
} elseif (Test-Path -LiteralPath (Join-Path $rootFull "files\project")) {
  $archiveBase = Join-Path $rootFull "files\project\_archive\backups_pruned"
} else {
  $archiveBase = Join-Path $rootFull "_archive\backups_pruned"
}

$archiveRoot = Join-Path $archiveBase $runStamp
$archiveBaseEsc = [regex]::Escape($archiveBase)

function Ensure-Dir([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) {
    New-Item -ItemType Directory -Force -Path $path | Out-Null
  }
}

function Parse-Timestamp([string]$name) {
  # NOTE: .NET regex group names are case-insensitive => avoid m/M collision by using mo/mi/s
  $patterns = @(
    '(?<y>\d{4})-(?<mo>\d{2})-(?<d>\d{2})-(?<H>\d{2})(?<mi>\d{2})(?<s>\d{2})',
    '(?<y>\d{4})(?<mo>\d{2})(?<d>\d{2})_(?<H>\d{2})(?<mi>\d{2})(?<s>\d{2})'
  )

  foreach ($p in $patterns) {
    $m = [regex]::Match($name, $p)
    if ($m.Success) {
      return [datetime]::new(
        [int]$m.Groups["y"].Value,
        [int]$m.Groups["mo"].Value,
        [int]$m.Groups["d"].Value,
        [int]$m.Groups["H"].Value,
        [int]$m.Groups["mi"].Value,
        [int]$m.Groups["s"].Value
      )
    }
  }
  return $null
}

function Get-CanonicalKey([string]$fullName) {
  if ($fullName -match '^(?<base>.+?)\.bak[._].+$') {
    return $Matches["base"]
  }
  return $null
}

function Should-ExcludePath([string]$fullName) {
  if ($fullName -match '\\node_modules\\') { return $true }
  if ($fullName -match '\\\.next\\') { return $true }

  # prevent archive recursion
  if ($fullName -match '\\_archive\\backups_pruned\\') { return $true }
  if ($fullName -match $archiveBaseEsc) { return $true }

  return $false
}

Write-Host "Root: $rootFull" -ForegroundColor Cyan
Write-Host "Archive: $archiveRoot" -ForegroundColor Cyan

# 1) Backup files
Write-Host "Scanning for backup files..." -ForegroundColor Cyan

$backupFiles = @(Get-ChildItem -LiteralPath $rootFull -Recurse -File -Force -Include *.bak.*,*.bak_* |
  Where-Object { -not (Should-ExcludePath $_.FullName) } |
  ForEach-Object {
    $ts = Parse-Timestamp $_.Name
    $key = Get-CanonicalKey $_.FullName
    if ($ts -and $key) {
      [pscustomobject]@{
        Type = "file"
        FullName = $_.FullName
        Key = $key
        Timestamp = $ts
      }
    }
  } |
  Where-Object { $_ -ne $null }
)

$groups  = @($backupFiles | Group-Object Key)
$toKeep  = @()
$toRemove = @()

foreach ($g in $groups) {
  $sorted = @($g.Group | Sort-Object Timestamp -Descending)
  if ($sorted.Count -ge 1) { $toKeep += $sorted[0] }
  if ($sorted.Count -gt 1) { $toRemove += $sorted[1..($sorted.Count - 1)] }
}

Write-Host "Backup files found: $($backupFiles.Count)" -ForegroundColor Gray
Write-Host "Keep newest per file: $($toKeep.Count)" -ForegroundColor Green
Write-Host "Remove old backups: $($toRemove.Count)" -ForegroundColor Yellow

# 2) Backup folders
Write-Host "`nScanning for backup folders..." -ForegroundColor Cyan

$backupDirs = @(Get-ChildItem -LiteralPath $rootFull -Recurse -Directory -Force |
  Where-Object { -not (Should-ExcludePath $_.FullName) } |
  ForEach-Object {
    $name = $_.Name
    $ts = $null

    # _bak_20251227-224233 or backups-20251227-224233 => YYYYMMDD-HHMMSS
    if ($name -match '(_bak_|backups-)(?<y>\d{4})(?<mo>\d{2})(?<d>\d{2})-(?<H>\d{2})(?<mi>\d{2})(?<s>\d{2})') {
      $ts = [datetime]::new(
        [int]$Matches["y"], [int]$Matches["mo"], [int]$Matches["d"],
        [int]$Matches["H"], [int]$Matches["mi"], [int]$Matches["s"]
      )
    }
    # backups-2026-01-13-120102 => YYYY-MM-DD-HHMMSS
    elseif ($name -match '(backups-)(?<y>\d{4})-(?<mo>\d{2})-(?<d>\d{2})-(?<H>\d{2})(?<mi>\d{2})(?<s>\d{2})') {
      $ts = [datetime]::new(
        [int]$Matches["y"], [int]$Matches["mo"], [int]$Matches["d"],
        [int]$Matches["H"], [int]$Matches["mi"], [int]$Matches["s"]
      )
    }

    if ($ts) {
      [pscustomobject]@{
        Type = "dir"
        FullName = $_.FullName
        Key = $_.Parent.FullName
        Timestamp = $ts
      }
    }
  } |
  Where-Object { $_ -ne $null }
)

$dirGroups = @($backupDirs | Group-Object Key)
$dirKeep = @()
$dirRemove = @()

foreach ($g in $dirGroups) {
  $sorted = @($g.Group | Sort-Object Timestamp -Descending)
  if ($sorted.Count -ge 1) { $dirKeep += $sorted[0] }
  if ($sorted.Count -gt 1) { $dirRemove += $sorted[1..($sorted.Count - 1)] }
}

Write-Host "Backup dirs found: $($backupDirs.Count)" -ForegroundColor Gray
Write-Host "Keep newest per parent: $($dirKeep.Count)" -ForegroundColor Green
Write-Host "Remove old dirs: $($dirRemove.Count)" -ForegroundColor Yellow

function Move-Or-Delete([pscustomobject]$item) {
  if (-not (Test-Path -LiteralPath $item.FullName)) {
    Write-Host "[Skip] Not found: $($item.FullName)" -ForegroundColor DarkGray
    return
  }

  if ($DeletePermanently) {
    if ($WhatIf) {
      Write-Host "[WhatIf] DELETE $($item.FullName)" -ForegroundColor DarkYellow
    } else {
      if ($item.Type -eq "file") { Remove-Item -LiteralPath $item.FullName -Force }
      else { Remove-Item -LiteralPath $item.FullName -Recurse -Force }
    }
    return
  }

  if (-not $WhatIf) { Ensure-Dir $archiveRoot }

  $rel = $item.FullName.Replace($rootFull, '').TrimStart('\')
  $dest = Join-Path $archiveRoot $rel
  $destDir = Split-Path $dest -Parent

  if ($WhatIf) {
    Write-Host "[WhatIf] MOVE $($item.FullName) -> $dest" -ForegroundColor DarkYellow
  } else {
    Ensure-Dir $destDir
    Move-Item -LiteralPath $item.FullName -Destination $dest -Force
  }
}

Write-Host "`n--- MODE: $(if($WhatIf){'DRY RUN'} else {'ACTION'}) ---" -ForegroundColor Cyan

$allRemove = @($toRemove + $dirRemove)
foreach ($i in $allRemove) { Move-Or-Delete $i }

Write-Host "`nDONE. Archive: $archiveRoot" -ForegroundColor Cyan
if ($WhatIf) { Write-Host "Tip: rerun without -WhatIf to actually move/delete." -ForegroundColor Gray }
