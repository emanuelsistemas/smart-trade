@echo off
title Smart-Trade System - Status
color 0E

echo.
echo ========================================
echo   📊 SMART-TRADE SYSTEM STATUS 📊
echo ========================================
echo.

echo 🔍 Verificando processos Node.js...
tasklist /fi "imagename eq node.exe" | findstr node.exe >nul
if errorlevel 1 (
    echo ❌ Nenhum processo Node.js encontrado
) else (
    echo ✅ Processos Node.js ativos:
    tasklist /fi "imagename eq node.exe"
)

echo.
echo 🔍 Verificando portas do sistema...

:: Verificar Backend (porta 3001)
netstat -ano | findstr :3001 >nul
if errorlevel 1 (
    echo ❌ Backend (porta 3001): NÃO RODANDO
) else (
    echo ✅ Backend (porta 3001): RODANDO
    netstat -ano | findstr :3001
)

echo.
rem Verificar Frontend (porta 3000)
netstat -ano | findstr :3000 >nul
if errorlevel 1 (
    echo ❌ Frontend (porta 3000): NÃO RODANDO
) else (
    echo ✅ Frontend (porta 3000): RODANDO
    netstat -ano | findstr :3000
)

echo.
rem Verificar WebSocket (porta 3002)
netstat -ano | findstr :3002 >nul
if errorlevel 1 (
    echo ⚠️  WebSocket (porta 3002): NÃO DETECTADO
) else (
    echo ✅ WebSocket (porta 3002): RODANDO
    netstat -ano | findstr :3002
)

echo.
echo ========================================
echo 💡 INFORMAÇÕES ÚTEIS
echo ========================================
echo.
echo 🌐 URLs do Sistema:
echo    🔹 Frontend: http://localhost:3000
echo    🔹 Backend:  http://localhost:3001
echo    🔹 WebSocket: ws://localhost:3002
echo.
echo 🛠️  Comandos úteis:
echo    🔹 Iniciar:  start-smart-trade.bat
echo    🔹 Parar:    stop-smart-trade.bat
echo    🔹 Status:   status-smart-trade.bat
echo.

pause
