# PCMon - Sistema de Monitoramento de Atividades de Usuários

Sistema completo de monitoramento e análise de atividades de usuários em estações Windows, composto por agente Python, API REST em PHP e dashboard web interativo em React.

## 📐 Arquitetura

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Windows Agent  │─────▶│   REST API (PHP) │◀─────│ React Dashboard │
│    (Python)     │      │   + MariaDB      │      │   (Vite + TW)   │
└─────────────────┘      └──────────────────┘      └─────────────────┘
    Coleta dados            Processa e armazena        Visualiza dados
```

### Componentes

- **Agent** (Python): Monitora atividades de janelas, mouse e processos em estações Windows
- **Backend API** (PHP 8.2): REST API com endpoints para recepção e consulta de dados
- **Frontend** (React 18): Dashboard web para análise e visualização de métricas
- **Database** (MariaDB 10.x): Armazenamento de dados de atividades

## 🛠 Stack Tecnológico

### Agent (Windows)
- **Python 3.14**
- **psutil** - Coleta de informações de processos
- **pywin32** - Integração com Windows API
- **requests** - Comunicação HTTP com API
- **cx_Freeze** - Geração de executável standalone

### Backend
- **PHP 8.2** + Apache
- **MariaDB 10.x** (servidor externo)
- **Docker** + Docker Compose

### Frontend
- **React 18** + React Router
- **Vite** - Build tool
- **Tailwind CSS** - Estilização
- **Recharts** - Visualização de dados
- **Axios** - Cliente HTTP
- **Lucide React** - Ícones

## 📂 Estrutura do Projeto

```
pcmon/
├── agent/                          # Windows monitoring agent
│   ├── main.py                     # Entry point
│   ├── monitor.py                  # Core monitoring logic
│   ├── config.py                   # Configuration loader
│   ├── setup.py                    # cx_Freeze build config
│   ├── build.bat                   # Build script
│   ├── config.json.template        # Config template
│   └── dist/                       # Built executables
│
├── src/                            # Backend API
│   ├── index.php                   # Main router
│   └── endpoints/                  # API endpoints
│       ├── window-activity.php     # Window activity CRUD
│       ├── activity-periods.php    # Activity periods
│       ├── computer.php            # Computer info
│       ├── mouse-activity.php      # Mouse tracking
│       ├── windows-snapshot.php    # Window snapshots
│       ├── user-analytics.php      # User analytics
│       ├── stats.php               # Statistics
│       └── cleanup.php             # Data cleanup
│
├── frontend/                       # React dashboard
│   ├── src/
│   │   ├── App.jsx                 # Main app component
│   │   ├── pages/                  # Page components
│   │   ├── components/             # Reusable components
│   │   └── services/
│   │       └── api.js              # API client
│   └── public/
│
├── config/
│   └── database.php                # Database connection config
│
├── database/                       # SQL schemas
│   ├── activity_periods.sql
│   ├── last_mouse_activity.sql
│   └── windows_snapshot.sql
│
├── docker-compose.yml              # Services orchestration
├── Dockerfile                      # PHP API image
└── README.md
```

## 🚀 Setup e Instalação

### Pré-requisitos

- Docker 20.x+
- Docker Compose 2.x+
- Node.js 18+ (para desenvolvimento frontend)
- Python 3.14+ (para desenvolvimento do agent)

### 1. Backend + Frontend (Docker)

```bash
# Clone o repositório
git clone <repository-url>
cd pcmon

# Configure o banco de dados em config/database.php
# Ajuste as credenciais se necessário

# Suba os containers
docker-compose up -d

# Verifique os logs
docker-compose logs -f
```

**Serviços disponíveis:**
- API: http://localhost:8090
- Frontend: http://localhost:3000

### 2. Banco de Dados

Execute os scripts SQL em ordem:

```bash
mysql -h 10.1.3.173 -u UNIAGENTE -p unimonitor < database/activity_periods.sql
mysql -h 10.1.3.173 -u UNIAGENTE -p unimonitor < database/last_mouse_activity.sql
mysql -h 10.1.3.173 -u UNIAGENTE -p unimonitor < database/windows_snapshot.sql
```

**Tabelas criadas:**
- `activity_events` - Eventos de atividades de janelas
- `activity_periods` - Períodos de atividade/inatividade
- `daily_activity_summary` - Resumo diário agregado
- `last_mouse_activity` - Última atividade de mouse
- `windows_snapshot` - Snapshots de janelas abertas

### 3. Windows Agent

```bash
cd agent

# Instale as dependências
pip install -r requirements.txt

# Configure a URL da API
copy config.json.template config.json
# Edite config.json com a URL da sua API

# Build do executável (Windows)
build.bat

# O executável estará em: dist\WinSysMonitor\WinSysMonitor.exe
```

**Instalação no endpoint:**
1. Copie `dist\WinSysMonitor\` para o cliente
2. Execute o instalador MSI (em desenvolvimento)
3. O agent inicia automaticamente e roda em background

## 📡 API Endpoints

### Activity Management

#### POST `/api/window-activity`
Registra nova atividade de janela
```json
{
  "hostname": "DESKTOP-001",
  "username": "john.doe",
  "executable": "chrome.exe",
  "pid": 1234,
  "window_title": "Google Chrome",
  "start_time": "2026-01-30 10:00:00"
}
```

#### GET `/api/window-activities`
Lista atividades com filtros e paginação
- Query params: `hostname`, `username`, `executable`, `date`, `page`, `limit`

#### PUT `/api/window-activity/{id}`
Finaliza atividade com tempo de término
```json
{
  "end_time": "2026-01-30 10:05:00",
  "duration_second": 300
}
```

### Activity Periods

#### POST `/api/activity-periods`
Registra período de atividade/inatividade
```json
{
  "hostname": "DESKTOP-001",
  "username": "john.doe",
  "period_type": "active",
  "start_time": "2026-01-30 10:00:00"
}
```

#### GET `/api/activity-periods/summary`
Retorna resumo agregado de atividades
- Query params: `hostname`, `username`, `start_date`, `end_date`

### Mouse Activity

#### POST `/api/mouse-activity`
Atualiza última atividade de mouse
```json
{
  "hostname": "DESKTOP-001",
  "username": "john.doe"
}
```

#### GET `/api/mouse-activity/list`
Lista última atividade por usuário/computador

### Windows Snapshot

#### POST `/api/windows-snapshot`
Salva snapshot de janelas abertas
```json
{
  "hostname": "DESKTOP-001",
  "username": "john.doe",
  "windows": [
    {
      "title": "Google Chrome",
      "executable": "chrome.exe",
      "pid": 1234
    }
  ]
}
```

### Analytics & Stats

#### GET `/api/user-analytics`
Analytics detalhado por usuário
- Tempo total de uso
- Aplicativos mais usados
- Padrões de uso por horário
- Query params: `hostname`, `username`, `start_date`, `end_date`

#### GET `/api/stats`
Estatísticas gerais do sistema

### Computer Info

#### GET `/api/computers`
Lista todos os computadores monitorados

#### GET `/api/computer/{hostname}`
Detalhes de um computador específico

### Data Cleanup

#### DELETE `/endpoints/cleanup.php/all`
Remove TODOS os dados (TRUNCATE)

#### DELETE `/endpoints/cleanup.php/old`
Remove dados com mais de 30 dias

## 🔧 Configuração

### Backend (config/database.php)

```php
define('DB_HOST', '10.1.3.173');
define('DB_PORT', '3306');
define('DB_NAME', 'unimonitor');
define('DB_USER', 'UNIAGENTE');
define('DB_PASSWORD', 'U@1nM0n!');
```

### Agent (agent/config.json)

```json
{
  "api_url": "http://10.1.0.172:8090"
}
```

### Frontend (frontend/src/services/api.js)

```javascript
const API_BASE_URL = 'http://10.1.0.172:8090';
```

## 🐳 Docker

### Rebuild containers

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Ver logs

```bash
docker-compose logs -f api
docker-compose logs -f frontend
```

### Acesso ao container

```bash
docker exec -it pcmon_api bash
docker exec -it pcmon_frontend sh
```

## 📊 Database Schema

### activity_events
```sql
- id (PK)
- hostname, username
- executable, pid, window_title
- start_time, end_time, duration_seconds
- timestamps
```

### activity_periods
```sql
- id (PK)
- hostname, username
- period_type (active/inactive)
- start_time, end_time, duration_seconds
- timestamps
```

### daily_activity_summary
```sql
- id (PK)
- hostname, username, date
- total_active_seconds, total_inactive_seconds
- first_activity, last_activity
- timestamps
```

## 🔐 Segurança

- CORS habilitado para desenvolvimento (ajustar em produção)
- Prepared statements para prevenir SQL injection
- Sanitização de inputs
- Credenciais via environment variables

## 🧪 Desenvolvimento

### Frontend (Hot reload)

```bash
cd frontend
npm install
npm run dev
# Acesse: http://localhost:5173
```

### Backend (logs em tempo real)

```bash
docker-compose logs -f api
```

### Agent (modo debug)

```bash
cd agent
python main.py --debug
# Logs em: %LOCALAPPDATA%\WinSysMonitor\monitor.log
```

## 📝 TODO / Roadmap

- [ ] Autenticação JWT na API
- [ ] Rate limiting
- [ ] Compressão de dados antigos
- [ ] Export de relatórios (PDF/Excel)
- [ ] Alertas em tempo real
- [ ] Dashboard de administração
- [ ] Suporte multi-idioma
- [ ] Tema escuro no frontend

## 📄 Licença

Projeto proprietário - Todos os direitos reservados

## 👥 Contribuidores

Desenvolvido internamente para monitoramento de estações de trabalho.

---

**Versão:** 1.0.0  
**Última atualização:** Janeiro 2026
```

### Computadores

#### Registrar computador
```http
POST /api/computer/register
Content-Type: application/json

{
  "hostname": "DESKTOP-ABC123",
  "username": "usuario",
  "os_type": "Windows",
  "os_version": "10 Pro"
}
```

#### Listar computadores
```http
GET /api/computers?status=active
```

### Estatísticas

#### Obter estatísticas diárias
```http
GET /api/stats/daily?hostname=DESKTOP-ABC123&date=2026-01-21
```

## 🗄️ Estrutura do Banco de Dados

### Tabela: window_activities
Armazena todas as atividades de janelas dos computadores monitorados.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INT | ID único da atividade |
| hostname | VARCHAR(255) | Nome do computador |
| username | VARCHAR(255) | Nome do usuário |
| executable | VARCHAR(500) | Executável da aplicação |
| pid | INT | Process ID |
| window_title | VARCHAR(1000) | Título da janela |
| start_time | DATETIME | Início da atividade |
| end_time | DATETIME | Fim da atividade |
| duration_second | DECIMAL(10,7) | Duração em segundos |

### Tabela: computers
Informações dos computadores monitorados.

### Tabela: applications
Catálogo de aplicações detectadas.

### Tabela: daily_stats
Estatísticas agregadas por dia.

## 🧪 Testando a API

### Usando cURL

```bash
# Health check
curl http://localhost:8080/api/health

# Registrar atividade
curl -X POST http://localhost:8080/api/window-activity \
  -H "Content-Type: application/json" \
  -d '{
    "hostname": "DESKTOP-TEST",
    "username": "testuser",
    "executable": "chrome",
    "pid": 1234,
    "window_title": "Test Window",
    "start_time": "2026-01-28 10:00:00"
  }'

# Listar atividades
curl http://localhost:8080/api/window-activities
```

## 🔐 Configurações

As configurações podem ser alteradas no arquivo [docker-compose.yml](docker-compose.yml):

- **Portas**: Modde banco de dados estão no [docker-compose.yml](docker-compose.yml) e [config/database.php](config/database.php):

- **Host**: 10.1.3.173
- **Porta**: 3306
- **Database**: unimonitor
- **Usuário**: UNIAGENTE
- **Senha**: U@1nM0n!

Para alterar a porta da API, modifique em [docker-compose.yml](docker-compose.yml) a linha `ports: - "8080:80"`.

docker-compose up -d

# Ver logs
docker-compose logs -f api

# Parar container
docker-compose stop

# Parar e remover container
docker-compose down

# Reconstruir imagem
docker-compose build

# Reiniciarainers + volumes (CUIDADO: apaga o banco!)
docker-compose down -v

# Reconstruir imagens
docker-compose build

# Reiniciar um serviço
docker-compose restart api
```

### Acessar container

```bash
# Acessar shell do container PHP
docker exec -it pcmon_api bash

# Acessar MariaDB
docker exec -it pcmon_db mysql -u pcmon_user -p
```

## 🐛 Troubleshooting

### Portas em uso
Se as portas 8080, 8081 ou 3306 já estiverem em uso, altere-as no [docker-compose.yml](docker-compose.yml).

### Permissões
Se houver erros de permissão, certifique-se de que os diretórios têm as permissões corretas:
```bash
chmod -R 755 src/
```
Verifique se o servidor 10.1.3.173 está acessível e se as credenciais estão corretas. Teste a conectividade:
```bash
# Do host
nc -zv 10.1.3.173 3306

# Do container
docker exec -it pcmon_api bash
apt-get update && apt-get install -y mariadb-client
mysql -h 10.1.3.173 -u UNIAGENTE -p unimonitor
```

### Porta em uso
Se a porta 8080 já estiver em uso, altere no [docker-compose.yml](docker-compose.yml) a linha:
```yaml
ports:
  - "8888:80"  # Altera para porta 8888, por exemplo
```
- [ ] Implementar autenticação JWT
- [ ] Adicionar validação mais robusta de dados
- [ ] Implementar rate limiting
- [ ] Criar dashboard web para visualização
- [ ] Adicionar testes automatizados
- [ ] Implementar sistema de alertas
- [ ] Adicionar suporte a WebSocket para dados em tempo real

## 📄 Licença

Este projeto está sob licença MIT.
