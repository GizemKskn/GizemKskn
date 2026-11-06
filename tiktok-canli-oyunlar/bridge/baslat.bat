@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo Ilk kurulum yapiliyor, lutfen bekleyin...
  call npm install
)
set /p KULLANICI=TikTok kullanici adiniz (@ olmadan): 
node server.js %KULLANICI%
pause
