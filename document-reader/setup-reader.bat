@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -m venv .venv
) else (
  python -m venv .venv
)
if errorlevel 1 goto :error
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
if errorlevel 1 goto :error
pip install -r requirements.txt
if errorlevel 1 goto :error
rapidocr check
if errorlevel 1 goto :error
echo.
echo ============================================================
echo Agents India Document Reader installed successfully.
echo Next time run start-reader.bat
ECHO ============================================================
pause
exit /b 0
:error
echo.
echo Installation failed. Copy the error shown above and send it to ChatGPT.
pause
exit /b 1
