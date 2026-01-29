@echo off
echo ========================================
echo WinSysMonitor - Build Executavel
echo ========================================
echo.

REM Verifica se existe config.json.template
if not exist "config.json.template" (
    echo Criando config.json.template com valores padrão...
    echo {"api_url": "http://10.1.0.172:8090"} > config.json.template
)

REM Mostra URL da API configurada
echo URL da API configurada:
type config.json.template
echo.

REM Limpa builds anteriores
echo [1/3] Limpando builds anteriores...
if exist "build" rmdir /s /q build
if exist "dist" rmdir /s /q dist

REM Gera executável
echo [2/3] Gerando executavel...
python setup.py build

if errorlevel 1 (
    echo ERRO: Falha ao gerar executavel
    pause
    exit /b 1
)

REM Copia para pasta de distribuição
echo [3/3] Preparando distribuicao...
if not exist "dist\WinSysMonitor" mkdir "dist\WinSysMonitor"
xcopy /E /I /Y "build\exe.win-amd64-3.14" "dist\WinSysMonitor"

echo.
echo ========================================
echo Build concluido com sucesso!
echo ========================================
echo.
echo Executavel gerado em: dist\WinSysMonitor\WinSysMonitor.exe
echo.
echo Uso:
echo   WinSysMonitor.exe           - Executa em modo normal
echo   WinSysMonitor.exe --debug   - Executa com logs detalhados
echo.
echo Logs salvos em: C:\ProgramData\WinSysMonitor\monitor.log
echo.
pause
