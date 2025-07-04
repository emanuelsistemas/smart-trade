@echo off
echo 🚀 Iniciando Smart-Trade System com PM2...

:: Parar processos existentes (se houver)
pm2 stop smart-trade-backend 2>nul
pm2 stop smart-trade-frontend 2>nul

:: Deletar processos existentes (se houver)
pm2 delete smart-trade-backend 2>nul
pm2 delete smart-trade-frontend 2>nul

:: Iniciar backend
echo 📡 Iniciando Backend...
cd /d "%~dp0..\server"
pm2 start "npx ts-node src/main.ts" --name smart-trade-backend --log-date-format "YYYY-MM-DD HH:mm:ss Z"

:: Aguardar um pouco
timeout /t 3 /nobreak >nul

:: Iniciar frontend
echo 🌐 Iniciando Frontend...
cd /d "%~dp0..\client"
pm2 start "npm run dev" --name smart-trade-frontend --log-date-format "YYYY-MM-DD HH:mm:ss Z"

:: Voltar ao diretório raiz
cd /d "%~dp0.."

:: Mostrar status
echo.
echo 📊 Status dos processos:
pm2 status

:: Salvar configuração PM2
pm2 save

echo.
echo ✅ Smart-Trade System iniciado com sucesso!
echo.
echo 📊 Para monitorar os processos:
echo    pm2 monit
echo.
echo 📋 Para ver logs:
echo    pm2 logs
echo.
echo 🔄 Para reiniciar:
echo    pm2 restart all
echo.
echo 🛑 Para parar:
echo    pm2 stop all
echo.

pause
