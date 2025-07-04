@echo off
title Smart-Trade System - Stop
color 0C

echo.
echo ========================================
echo    🛑 PARANDO SMART-TRADE SYSTEM 🛑
echo ========================================
echo.

echo 🔍 Procurando processos Node.js relacionados ao Smart-Trade...

:: Matar processos específicos do Smart-Trade
taskkill /f /im node.exe 2>nul
taskkill /f /im npm.cmd 2>nul
taskkill /f /im npx.cmd 2>nul

:: Parar processos PM2 se existirem
pm2 delete smart-trade-backend 2>nul
pm2 delete smart-trade-frontend 2>nul
pm2 stop all 2>nul

echo.
echo ✅ Processos do Smart-Trade foram encerrados!
echo.
echo 💡 Se ainda houver processos rodando, você pode:
echo    - Fechar manualmente as janelas do terminal
echo    - Usar o Gerenciador de Tarefas do Windows
echo.

pause
