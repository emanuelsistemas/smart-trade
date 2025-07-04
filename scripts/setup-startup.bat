@echo off
echo 🔧 Configurando inicialização automática do Smart-Trade System...
echo.

:: Gerar script de inicialização
pm2 startup

echo.
echo ⚠️  IMPORTANTE: Execute o comando mostrado acima como Administrador!
echo.
echo Depois execute:
echo    pm2 save
echo.
echo Para configurar os processos para iniciar automaticamente no boot.
echo.

pause
