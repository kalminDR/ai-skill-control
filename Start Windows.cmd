@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 goto python
py -3 -E -s -B server.py --open
goto done
:python
python -E -s -B server.py --open
:done
if errorlevel 1 pause
