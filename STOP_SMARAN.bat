@echo off
setlocal
cd /d "%~dp0"
echo [SMARAN] Stopping Smaran development server...
npm run dev:stop
pause
