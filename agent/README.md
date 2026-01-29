# WinSysMonitor - Agent de Monitoramento

Agent Windows para monitorar atividades do usuário e enviar para a API.

## Características

- **Execução silenciosa**: Sem janelas, alertas ou notificações
- **Monitoramento automático**: Detecta janela ativa a cada 2 segundos
- **Checkpoint inteligente**: Envia dados a cada 5 minutos para atividades longas
- **Modo debug**: Logs detalhados para troubleshooting
- **Configurável**: URL da API via arquivo config.json

## Build do Executável

### Pré-requisitos

```bash
pip install -r requirements.txt
```

### Gerar Executável

```cmd
build.bat
```

O executável será gerado em: `dist\WinSysMonitor\WinSysMonitor.exe`

## Configuração da API

Edite o arquivo `config.json` junto ao executável:

```json
{
  "api_url": "http://SEU_SERVIDOR:8090"
}
```

## Uso

### Modo Normal
```cmd
WinSysMonitor.exe
```
- Roda em background sem interface
- Apenas erros são logados

### Modo Debug
```cmd
WinSysMonitor.exe --debug
```
ou
```cmd
WinSysMonitor.exe -d
```
- Logs detalhados de todas as atividades
- Útil para troubleshooting

## Logs

Logs são salvos em: `C:\ProgramData\WinSysMonitor\monitor.log`

### Modo Normal
- Apenas erros críticos
- Problemas de conexão com API
- Falhas no monitoramento

### Modo Debug
- Inicialização do monitor
- Cada janela detectada
- Atividades enviadas à API
- Checkpoints de 5 minutos
- Todos os erros

## Distribuição

O executável pode ser distribuído via:

1. **Group Policy (GPO)**
   - Startup Script
   - Logon Script

2. **Task Scheduler**
   - Criar tarefa agendada
   - Executar no logon

3. **Registry Run Key**
   ```reg
   HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run
   ```

4. **Startup Folder**
   - Copiar atalho para: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`

## Estrutura de Dados Enviados

```json
{
  "hostname": "DESKTOP-ABC123",
  "username": "usuario",
  "executable": "chrome.exe",
  "pid": 12345,
  "window_title": "GitHub - Google Chrome",
  "start_time": "2026-01-28 10:30:15.123456",
  "end_time": "2026-01-28 10:32:45.654321",
  "duration_seconds": 150.53
}
```

## Endpoint da API

**POST** `/api/window-activities`

## Troubleshooting

### Agent não está enviando dados

1. Execute em modo debug:
   ```cmd
   WinSysMonitor.exe --debug
   ```

2. Verifique o log:
   ```
   C:\ProgramData\WinSysMonitor\monitor.log
   ```

3. Confirme a URL da API no `config.json`

4. Teste conectividade:
   ```cmd
   curl http://SEU_SERVIDOR:8090/api/window-activities
   ```

### DLL Load Failed

Se aparecer erro de DLL ao executar:
- Certifique-se que pywin32>=311 está instalado
- Rebuild o executável
- Os DLLs serão incluídos automaticamente

### Agent não inicia

- Verifique se não há outra instância rodando
- Confira permissões do diretório `C:\ProgramData\WinSysMonitor`
- Execute em modo debug para ver erros detalhados
