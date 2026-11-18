@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deployment\start.ps1"
if errorlevel 1 (
    echo.
    echo SmartBiz could not start. Check the error above.
    pause
)
