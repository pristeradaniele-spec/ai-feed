@echo off
cd /d "%~dp0"
call .venv\Scripts\activate.bat
python pipeline.py >> pipeline.log 2>&1
