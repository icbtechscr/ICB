@echo off
setlocal
REM Crea o actualiza una tarea de Windows para correr ventas + cotizaciones CPI cada 30 minutos.

set "TASK_NAME=ICB Sync CPI"
set "SCRIPT=%~dp0sync-cpi-all-auto.bat"

echo.
echo Creando/actualizando tarea "%TASK_NAME%" cada 30 minutos...
echo Script: "%SCRIPT%"
echo.

schtasks /Create /TN "%TASK_NAME%" /TR "\"%SCRIPT%\"" /SC MINUTE /MO 30 /F
if errorlevel 1 (
  echo.
  echo No se pudo crear la tarea. Proba ejecutar este archivo como administrador.
  echo Tambien podes crearla manualmente apuntando a:
  echo "%SCRIPT%"
  echo.
  pause
  exit /b 1
)

echo.
echo Tarea lista. Ejecutando una primera sincronizacion de prueba...
schtasks /Run /TN "%TASK_NAME%"

echo.
echo Listo. El log queda en scripts\sync-cpi-all.log
echo.
pause
