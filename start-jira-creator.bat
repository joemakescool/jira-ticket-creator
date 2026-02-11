@echo off
setlocal

:: Change to script directory
cd /d "%~dp0"

:: Set production environment
set NODE_ENV=production
set PORT=5050

:: Wait for network to be ready on startup
set MAX_WAIT=30
set WAITED=0
:wait_network
ping -n 1 127.0.0.1 >nul 2>&1
if errorlevel 1 (
    if %WAITED% lss %MAX_WAIT% (
        set /a WAITED+=2
        timeout /t 2 /nobreak >nul
        goto wait_network
    )
    echo Network not ready after %MAX_WAIT%s, attempting to start anyway...
)

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

:: Start server with retry logic
set RETRIES=0
set MAX_RETRIES=3
:start_server
node dist/server/server/index.js
if errorlevel 1 (
    set /a RETRIES+=1
    if %RETRIES% lss %MAX_RETRIES% (
        echo Server failed to start, retrying in 5s ^(attempt %RETRIES%/%MAX_RETRIES%^)...
        timeout /t 5 /nobreak >nul
        goto start_server
    )
    echo Server failed after %MAX_RETRIES% attempts.
    pause
    exit /b 1
)
