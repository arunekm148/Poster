@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
  echo Python virtual environment not found.
  echo Run setup-reader.bat first.
  pause
  exit /b 1
)
call .venv\Scripts\activate.bat
python -m uvicorn app:app --host 127.0.0.1 --port 8001
pause
