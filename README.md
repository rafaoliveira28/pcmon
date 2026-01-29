# PC Monitor API

Sistema de monitoramento de atividades de computadores via API REST.

## 🚀 Tecnologias

- PHP 8.2
- MariaDB (Banco externo: 10.1.3.173)
- Docker & Docker Compose
- Apache

## 📋 Estrutura do Projeto

```
pcmon/
├── config/
│   └── database.php          # Configurações do banco
├── database/
│   └── init.sql              # Script de inicialização do banco
├── src/
│   ├── index.php             # Router principal da API
│   └── endpoints/
│       ├── window-activity.php  # Endpoints de atividades
│       ├── computer.php         # Endpoints de computadores
│       └── stats.php            # Endpoints de estatísticas
├── docker-compose.yml        # Orquestração dos containers
├── Dockerfile                # Imagem PHP customizada
└── README.md                 # Este arquivo
```

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd pcmon
```

2. Inicie o container:
```bash
docker-compose up -d
```

3. A API estará disponível imediatamente (usa banco de dados externo já configurado)

## 🌐 Serviços

- **API**: http://localhost:8080
- **Banco de Dados**: 10.1.3.173:3306 (unimonitor)

## 📡 Endpoints da API

### Status da API
```http
GET /api/health
```

### Atividades de Janelas

#### Registrar nova atividade
```http
POST /api/window-activity
Content-Type: application/json

{
  "hostname": "DESKTOP-ABC123",
  "username": "usuario",
  "executable": "chrome.exe",
  "pid": 1234,
  "window_title": "Google Chrome",
  "start_time": "2026-01-21 11:49:24"
}
```

#### Listar atividades
```http
GET /api/window-activities?hostname=DESKTOP-ABC123&page=1&limit=50
```

Parâmetros de query:
- `hostname` - Filtrar por hostname
- `username` - Filtrar por usuário
- `executable` - Filtrar por executável
- `date` - Filtrar por data (YYYY-MM-DD)
- `page` - Número da página (padrão: 1)
- `limit` - Itens por página (padrão: 50)

#### Obter atividade específica
```http
GET /api/window-activities/{id}
```

#### Atualizar atividade (finalizar)
```http
PUT /api/window-activity/{id}
Content-Type: application/json

{
  "end_time": "2026-01-21 11:50:24",
  "duration_second": 60.5
}
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
