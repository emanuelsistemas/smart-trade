@echo off
title Smart-Trade System Manager
color 0A

echo.
echo ========================================
echo    🚀 SMART-TRADE SYSTEM MANAGER 🚀
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

echo 🔧 Parando processos existentes...
pm2 delete smart-trade-backend 2>nul
pm2 delete smart-trade-frontend 2>nul

echo.
echo 📡 Iniciando Backend...
cd /d "%~dp0server"
start "Smart-Trade Backend" cmd /k "npm run dev"

echo ⏳ Aguardando backend inicializar...
timeout /t 5 /nobreak >nul

echo.
echo 🌐 Iniciando Frontend...
cd /d "%~dp0client"
start "Smart-Trade Frontend" cmd /k "npm run dev"

cd /d "%~dp0"

echo.
echo ========================================
echo ✅ SMART-TRADE SYSTEM INICIADO!
echo ========================================
echo.
echo 📊 Serviços rodando:
echo    🔹 Backend:  http://localhost:3001
echo    🔹 WebSocket: ws://localhost:3002  
echo    🔹 Frontend: http://localhost:3000
echo.
echo 💡 Duas janelas de terminal foram abertas:
echo    - Uma para o Backend (servidor)
echo    - Uma para o Frontend (cliente)
echo.
echo 🛑 Para parar o sistema:
echo    - Feche as janelas do terminal OU
echo    - Execute: stop-smart-trade.bat
echo.

pause
