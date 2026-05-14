param(
  [Parameter(Mandatory = $true)]
  [string]$TargetPath,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$target = [System.IO.Path]::GetFullPath($TargetPath)

if (Test-Path -LiteralPath $target) {
  if (-not $Force) {
    throw "Target path already exists: $target"
  }

  Remove-Item -LiteralPath $target -Recurse -Force
}

$excludeDirs = @(
  ".git",
  ".next",
  "node_modules",
  ".playwright-mcp",
  ".agents",
  "data",
  "public\\uploads"
)

$excludeFiles = @(
  ".env",
  ".env.local",
  "tsconfig.tsbuildinfo",
  ".claude\\settings.local.json"
)

function ShouldSkip($fullPath) {
  if ($fullPath -eq $target -or $fullPath.StartsWith($target + "\")) {
    return $true
  }

  $relative = $fullPath.Substring($root.Length).TrimStart("\", "/")
  foreach ($dir in $excludeDirs) {
    if ($relative -eq $dir -or $relative.StartsWith($dir + "\")) {
      return $true
    }
  }
  foreach ($file in $excludeFiles) {
    if ($relative -eq $file) {
      return $true
    }
  }
  return $false
}

New-Item -ItemType Directory -Path $target | Out-Null

$items = Get-ChildItem -LiteralPath $root -Recurse -Force | Sort-Object @{ Expression = { -not $_.PSIsContainer } }, FullName
foreach ($item in $items) {
  if (ShouldSkip $item.FullName) { continue }

  $relative = $item.FullName.Substring($root.Length).TrimStart("\", "/")
  $destination = Join-Path $target $relative

  if ($item.PSIsContainer) {
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
  } else {
    $parent = Split-Path -Parent $destination
    if (-not (Test-Path -LiteralPath $parent)) {
      New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    Copy-Item -LiteralPath $item.FullName -Destination $destination -Force
  }
}

$dataDir = Join-Path $target "data"
$exportsDir = Join-Path $dataDir "exports"
$fontCacheDir = Join-Path $dataDir ".font-cache"
$uploadsDir = Join-Path $target "public\uploads"
$claudeCommandsDir = Join-Path $target ".claude\commands"
$claudeDir = Join-Path $target ".claude"

New-Item -ItemType Directory -Path $dataDir, $exportsDir, $fontCacheDir, $uploadsDir, $claudeDir -Force | Out-Null
if (-not (Test-Path -LiteralPath $claudeCommandsDir)) {
  New-Item -ItemType Directory -Path $claudeCommandsDir | Out-Null
}

$seeds = @{
  "brand.json" = @{
    name = ""
    colors = @{
      primary = "#1a1a2e"
      secondary = "#16213e"
      accent = "#e94560"
      background = "#ffffff"
      surface = "#f5f5f5"
    }
    fonts = @{
      heading = "Inter"
      body = "Inter"
    }
    customFonts = @()
    logoPath = $null
    styleKeywords = @()
    createdAt = ""
    updatedAt = ""
  }
  "carousels.json" = @{ carousels = @() }
  "integrations.json" = @{
    makeWebhookUrl = ""
    igUserId = ""
    updatedAt = ""
  }
  "templates.json" = @{ templates = @() }
  "staged-actions.json" = @{ actions = @() }
  "style-presets.json" = @{ presets = @() }
}

foreach ($entry in $seeds.GetEnumerator()) {
  $filePath = Join-Path $dataDir $entry.Key
  $json = $entry.Value | ConvertTo-Json -Depth 10
  [System.IO.File]::WriteAllText($filePath, $json + [Environment]::NewLine)
}

[System.IO.File]::WriteAllText((Join-Path $uploadsDir ".gitkeep"), "")
[System.IO.File]::WriteAllText((Join-Path $exportsDir ".gitkeep"), "")
[System.IO.File]::WriteAllText((Join-Path $fontCacheDir ".gitkeep"), "")

Get-ChildItem -LiteralPath $uploadsDir -Force |
  Where-Object { $_.Name -ne ".gitkeep" } |
  Remove-Item -Recurse -Force

$communityReadme = Join-Path $target "README.community.md"
$readme = Join-Path $target "README.md"
if (Test-Path -LiteralPath $communityReadme) {
  Copy-Item -LiteralPath $communityReadme -Destination $readme -Force
  Remove-Item -LiteralPath $communityReadme -Force
}

Write-Host ""
Write-Host "Clean community copy created at:" -ForegroundColor Green
Write-Host "  $target"
Write-Host ""
Write-Host "Next recommended steps:"
Write-Host "  1. Open the folder"
Write-Host "  2. Read README.md"
Write-Host "  3. Follow docs/GETTING_STARTED.md"
Write-Host ""
