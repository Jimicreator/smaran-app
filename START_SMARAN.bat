@echo off
setlocal
cd /d "%~dp0"
echo.
echo [SMARAN] Starting Smaran on port 3000...
echo [SMARAN] Keep this window open while using the app.
echo.
npm run dev
