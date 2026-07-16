# Install Zerro Dev Studio local CLI on Windows (PowerShell).
# Usage (PowerShell):
#   irm https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install.ps1 | iex
# Usage (CMD — no bash required):
#   curl -fsSL https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install.ps1 -o %TEMP%\zerro-install.ps1 && powershell -NoProfile -ExecutionPolicy Bypass -File %TEMP%\zerro-install.ps1

$ErrorActionPreference = "Stop"

$RepoUrl = if ($env:ZERRO_REPO_URL) { $env:ZERRO_REPO_URL } else { "https://github.com/Benjamin5607/zerro_ai_landing.git" }
$Branch = if ($env:ZERRO_BRANCH) { $env:ZERRO_BRANCH } else { "main" }
$Prefix = if ($env:ZERRO_INSTALL_DIR) { $env:ZERRO_INSTALL_DIR } else { Join-Path $env:USERPROFILE ".zerro" }
$PkgDir = Join-Path $Prefix "dev-studio"
$BinDir = Join-Path $Prefix "bin"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  Zerro Dev Studio - Windows install" -ForegroundColor Cyan
Write-Host "  Local coding agent (git + shell + files)" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

function Require-Command($name, $hint) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Write-Host "X $name is required. $hint" -ForegroundColor Red
    exit 1
  }
}

Require-Command node "Install Node.js 18+ from https://nodejs.org"
Require-Command git "Install Git from https://git-scm.com/download/win"
Require-Command npm "npm ships with Node.js"

$nodeMajor = [int](node -p "process.versions.node.split('.')[0]")
if ($nodeMajor -lt 18) {
  Write-Host "X Node.js 18+ required (found $(node -v))" -ForegroundColor Red
  exit 1
}

New-Item -ItemType Directory -Force -Path $Prefix | Out-Null
$Tmp = Join-Path $env:TEMP ("zerro-landing-" + [guid]::NewGuid().ToString("n"))
git clone --depth 1 --branch $Branch $RepoUrl $Tmp

Write-Host "-> Installing into $PkgDir" -ForegroundColor Green
if (Test-Path $PkgDir) { Remove-Item -Recurse -Force $PkgDir }
New-Item -ItemType Directory -Force -Path $PkgDir | Out-Null
Copy-Item -Recurse -Force (Join-Path $Tmp "zerro-dev-studio\*") $PkgDir
Remove-Item -Recurse -Force $Tmp

Push-Location $PkgDir
npm install --omit=dev 2>$null | Out-Null
Pop-Location

New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
$Entry = Join-Path $PkgDir "bin\zerro-dev.mjs"
$CmdPath = Join-Path $BinDir "zerro-dev.cmd"
$CmdContent = "@echo off`r`nnode `"$Entry`" %*`r`n"
Set-Content -Path $CmdPath -Value $CmdContent -Encoding ASCII
Copy-Item -Force $CmdPath (Join-Path $BinDir "zerro.cmd")

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$BinDir*") {
  $newPath = if ($userPath) { "$BinDir;$userPath" } else { $BinDir }
  [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
  $env:Path = "$BinDir;$env:Path"
  Write-Host "-> Added $BinDir to user PATH (open a new terminal if zerro-dev is not found)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Installed: zerro-dev.cmd -> $CmdPath" -ForegroundColor Green
Write-Host ""
Write-Host "Next (new PowerShell/CMD window):" -ForegroundColor White
Write-Host "  1. zerro-dev ollama connect     # one-click local Ollama" -ForegroundColor Gray
Write-Host "     OR set GROQ_API_KEY=...      # cloud API" -ForegroundColor Gray
Write-Host "  2. cd your-project" -ForegroundColor Gray
Write-Host "  3. zerro-dev" -ForegroundColor Gray
Write-Host ""
Write-Host "One-shot: zerro-dev `"fix login bug`"" -ForegroundColor Gray
Write-Host "Web IDE:  https://zerroai.space" -ForegroundColor Gray
Write-Host ""
