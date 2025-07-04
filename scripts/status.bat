@echo off
echo 📊 Status do Smart-Trade System...
echo.

:: Mostrar status dos processos
pm2 status

echo.
echo 📋 Para ver logs em tempo real:
echo    pm2 logs
echo.
echo 🔍 Para monitorar processos:
echo    pm2 monit
echo.

pause
