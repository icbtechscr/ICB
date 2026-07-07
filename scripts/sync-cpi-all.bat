@echo off
setlocal
REM Ejecuta manualmente ventas + cotizaciones CPI y muestra la salida en pantalla.

cd /d "%~dp0\.."

echo.
echo === Ventas CPI ===
node scripts\sync-cpi.mjs
set "SALES_EXIT=%ERRORLEVEL%"

echo.
echo === Cotizaciones CPI ===
node scripts\sync-cpi-quotes.mjs
set "QUOTES_EXIT=%ERRORLEVEL%"

echo.
echo Ventas CPI: codigo %SALES_EXIT%
echo Cotizaciones CPI: codigo %QUOTES_EXIT%

echo.
pause

if not "%SALES_EXIT%"=="0" exit /b %SALES_EXIT%
exit /b %QUOTES_EXIT%
