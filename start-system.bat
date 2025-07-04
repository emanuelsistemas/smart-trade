@echo off
echo 🚀 Iniciando Smart-Trade System...
echo.

echo 📡 Iniciando servidor backend...
start "Smart-Trade Server" cmd /k "cd server && npm run dev"

echo ⏳ Aguardando servidor inicializar...
timeout /t 5 /nobreak > nul

echo 🌐 Iniciando cliente frontend...
start "Smart-Trade Client" cmd /k "cd client && npm run dev"

echo.
echo ✅ Sistema iniciado!
echo 📡 Backend: http://localhost:3001
echo 🌐 Frontend: http://localhost:3000
echo 🔌 WebSocket: ws://localhost:3002
echo.
echo Pressione qualquer tecla para fechar...
pause > nul
