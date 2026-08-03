@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

set "VENV_DIR=.venv_desktop"
set "PYTHON_EXE=%VENV_DIR%\Scripts\python.exe"

where py >nul 2>nul
if errorlevel 1 (
    echo Python launcher "py" was not found. Install Python 3 and add it to PATH.
    pause
    exit /b 1
)

if not exist "%PYTHON_EXE%" (
    if exist "%VENV_DIR%" rmdir /s /q "%VENV_DIR%"
    py -3 -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo Failed to create virtual environment.
        pause
        exit /b 1
    )
)

"%PYTHON_EXE%" -m pip install --upgrade pip
if errorlevel 1 goto run_error

"%PYTHON_EXE%" -m pip install -r requirements-desktop.txt
if errorlevel 1 goto run_error

"%PYTHON_EXE%" desktop_app.py
if errorlevel 1 goto run_error

pause
exit /b 0

:run_error
echo.
echo ERROR. Try deleting the .venv_desktop folder and run this file again.
echo.
pause
exit /b 1
