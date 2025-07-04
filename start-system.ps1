# 🚀 Script para iniciar Smart-Trade System
Write-Host "🚀 Iniciando Smart-Trade System..." -ForegroundColor Green
Write-Host ""

Write-Host "📡 Iniciando servidor backend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm run dev" -WindowStyle Normal

Write-Host "⏳ Aguardando servidor inicializar..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "🌐 Iniciando cliente frontend..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "✅ Sistema iniciado!" -ForegroundColor Green
Write-Host "📡 Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔌 WebSocket: ws://localhost:3002" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
