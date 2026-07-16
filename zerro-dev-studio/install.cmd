@echo off
REM Zerro Dev Studio — Windows CMD installer (no bash required)
REM   curl -fsSL https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install.cmd -o %TEMP%\zerro-install.cmd && %TEMP%\zerro-install.cmd

set "SCRIPT=%TEMP%\zerro-dev-install.ps1"
echo Downloading Windows installer...
curl -fsSL "https://raw.githubusercontent.com/Benjamin5607/zerro_ai_landing/main/zerro-dev-studio/install.ps1" -o "%SCRIPT%"
if errorlevel 1 (
  echo Failed to download install.ps1
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
exit /b %ERRORLEVEL%
