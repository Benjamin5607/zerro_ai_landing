#Requires -Version 5.1
<#
  Zerro Dev Studio — one-line Windows install
  irm https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install-desktop.ps1 | iex
#>
$ErrorActionPreference = 'Stop'
$Version = '0.2.7'
$ReleaseApi = 'https://api.github.com/repos/Benjamin5607/zerro_ai_landing/releases/latest'
$FallbackUrl = "https://github.com/Benjamin5607/zerro_ai_landing/releases/download/desktop-v$Version/Zerro-Dev-Studio-$Version-Setup.zip"

Write-Host ""
Write-Host " Zerro Dev Studio installer" -ForegroundColor Cyan
Write-Host ""

$downloadUrl = $FallbackUrl
try {
  $rel = Invoke-RestMethod -Uri $ReleaseApi -Headers @{ 'User-Agent' = 'zerro-desktop-install' }
  $asset = $rel.assets | Where-Object { $_.name -like '*Setup.zip' } | Select-Object -First 1
  if ($asset) { $downloadUrl = $asset.browser_download_url }
} catch { }

$tmp = Join-Path $env:TEMP "zerro-desktop-setup"
$zip = Join-Path $env:TEMP "Zerro-Dev-Studio-Setup.zip"
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory -Path $tmp | Out-Null

Write-Host " Downloading: $downloadUrl"
Invoke-WebRequest -Uri $downloadUrl -OutFile $zip -UseBasicParsing

Write-Host " Extracting..."
Expand-Archive -Path $zip -DestinationPath $tmp -Force

$installCmd = Get-ChildItem -Path $tmp -Filter Install.cmd -Recurse | Select-Object -First 1
if (-not $installCmd) { throw 'Install.cmd not found in package' }

Write-Host " Running installer..."
$proc = Start-Process -FilePath $installCmd.FullName -WorkingDirectory $installCmd.DirectoryName -Wait -PassThru
if ($proc.ExitCode -and $proc.ExitCode -ne 0) {
  throw "Install.cmd exited $($proc.ExitCode)"
}

Write-Host ""
Write-Host " Done. Use the Desktop shortcut: Zerro Dev Studio" -ForegroundColor Green
