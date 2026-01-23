@echo off
TITLE SENTINEL-X CONTROL CENTER
COLOR 0A
echo ☣️ INITIATING DARK SENTINEL OPERATIONS...
echo 🛰️ TARGETING: INFRASTRUCTURE_V26

:: ตรวจสอบพิกัดไฟล์ agents.py อัตโนมัติ
if exist "agents.py" (
    python agents.py
) else if exist "backend\agents.py" (
    cd backend
    python agents.py
) else (
    echo ❌ [ERROR]: AGENTS.PY NOT FOUND! PLEASE CHECK YOUR DIRECTORY.
    pause
)
pause