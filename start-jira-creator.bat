@echo off
setlocal

:: Change to script directory
cd /d "%~dp0"

:: Set production environment
set NODE_ENV=production
set PORT=5050

:: Check if build exists
if not exist "dist\server\server\index.js" (
    echo Build not found. Running build first...
    call npm run build
    if errorlevel 1 (
        echo Build failed!
        pause
        exit /b 1
    )
)

:: Start the server silently
node dist/server/server/index.js
