@echo off
echo 🛑 Parando Smart-Trade System...

:: Parar todos os processos PM2
pm2 stop all

:: Mostrar status
pm2 status

echo.
echo ✅ Smart-Trade System parado com sucesso!
echo.

pause
