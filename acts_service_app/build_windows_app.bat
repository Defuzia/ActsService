@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo Building Windows desktop app ActsGenerator
echo ========================================
echo.

set "VENV_DIR=.venv_desktop"
set "PYTHON_EXE=%VENV_DIR%\Scripts\python.exe"

where py >nul 2>nul
if errorlevel 1 (
    echo Python launcher "py" was not found. Install Python 3 and add it to PATH.
    pause
    exit /b 1
)

if not exist "%PYTHON_EXE%" (
    echo Creating virtual environment...
    if exist "%VENV_DIR%" rmdir /s /q "%VENV_DIR%"
    py -3 -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo Failed to create virtual environment.
        pause
        exit /b 1
    )
)

if not exist "%PYTHON_EXE%" (
    echo Python was not found inside the virtual environment:
    echo %PYTHON_EXE%
    pause
    exit /b 1
)

"%PYTHON_EXE%" -m pip install --upgrade pip
if errorlevel 1 goto build_error

"%PYTHON_EXE%" -m pip install -r requirements-desktop.txt
if errorlevel 1 goto build_error

if exist "build" rmdir /s /q "build"
if exist "dist" rmdir /s /q "dist"
if exist "ActsGenerator.spec" del /q "ActsGenerator.spec"

echo.
echo Starting PyInstaller...
echo.

"%PYTHON_EXE%" -m PyInstaller --noconsole --onefile --clean --name ActsGenerator --icon "static\favicon.ico" --add-data "templates;templates" --add-data "static;static" --add-data "uploads;uploads" --hidden-import docx2pdf --hidden-import pythoncom --hidden-import pywintypes --hidden-import win32com --hidden-import win32com.client --hidden-import webview.platforms.winforms --hidden-import webview.platforms.edgechromium --collect-all webview desktop_app.py
if errorlevel 1 goto build_error

echo.
echo ========================================
echo DONE
echo App file:
echo %cd%\dist\ActsGenerator.exe
echo ========================================
echo.
echo Important: Microsoft Word must be installed for PDF generation.
echo.
pause
exit /b 0

:build_error
echo.
echo ========================================
echo BUILD ERROR
echo ========================================
echo.
echo Try deleting the .venv_desktop folder and run this file again.
echo.
pause
exit /b 1
