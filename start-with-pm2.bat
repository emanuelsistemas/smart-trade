@echo off
title Smart-Trade System - PM2 Mode
color 0B

echo.
echo ========================================
echo   🚀 SMART-TRADE SYSTEM - PM2 MODE 🚀
echo ========================================
echo.

:: Verificar se PM2 está instalado
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo ❌ PM2 não encontrado. Instalando...
    npm install -g pm2
    if errorlevel 1 (
        echo ❌ Erro ao instalar PM2. Verifique sua instalação do Node.js
        pause
        exit /b 1
    )
    echo ✅ PM2 instalado com sucesso!
)

echo 🔧 Limpando processos existentes...
pm2 delete all 2>nul

echo.
echo 📡 Iniciando Backend com PM2...
cd /d "%~dp0server"
pm2 start "npm run dev" --name "smart-trade-backend" --log-date-format "YYYY-MM-DD HH:mm:ss"

echo ⏳ Aguardando backend inicializar...
timeout /t 5 /nobreak >nul

echo.
echo 🌐 Iniciando Frontend com PM2...
cd /d "%~dp0client"  
pm2 start "npm run dev" --name "smart-trade-frontend" --log-date-format "YYYY-MM-DD HH:mm:ss"

cd /d "%~dp0"

echo.
echo 📊 Status dos processos PM2:
pm2 status

echo.
echo 💾 Salvando configuração PM2...
pm2 save

echo.
echo ========================================
echo ✅ SMART-TRADE SYSTEM INICIADO COM PM2!
echo ========================================
echo.
echo 📊 Serviços rodando:
echo    🔹 Backend:  http://localhost:3001
echo    🔹 WebSocket: ws://localhost:3002  
echo    🔹 Frontend: http://localhost:3000
echo.
echo 💡 Comandos úteis:
echo    🔹 Ver logs:      pm2 logs
echo    🔹 Monitorar:     pm2 monit
echo    🔹 Status:        pm2 status
echo    🔹 Reiniciar:     pm2 restart all
echo    🔹 Parar:         pm2 stop all
echo.

pause
