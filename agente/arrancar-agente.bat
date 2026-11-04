@echo off
rem Double-click to start the invoice reader agent. It waits for the CRM's "Revisar facturas" button.
rem Works from any location: it always runs from this file's folder.
title Agente de facturas - Mi Mascota
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo No se encuentra el entorno de Python en %~dp0.venv
  echo Instalalo con:  py -m venv .venv  y  .venv\Scripts\python -m pip install -r requirements.txt
  pause
  exit /b 1
)

".venv\Scripts\python.exe" agente.py
echo.
pause
