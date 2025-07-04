@echo off
echo 🔄 Reiniciando Smart-Trade System...

:: Reiniciar todos os processos PM2
pm2 restart all

:: Mostrar status
pm2 status

echo.
echo ✅ Smart-Trade System reiniciado com sucesso!
echo.

pause
