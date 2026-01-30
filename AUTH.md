# Sistema de Autenticação e Autorização

## Configuração Inicial

### 1. Criar as tabelas no banco de dados

Execute o script SQL para criar as tabelas de autenticação:

```bash
mysql -h 10.1.3.173 -u unimonitor -p unimonitor < database/users.sql
```

Ou manualmente via phpMyAdmin/Adminer executando o conteúdo do arquivo `database/users.sql`.

Este script cria:
- Tabela `users`: Armazena usuários do sistema
- Tabela `user_sessions`: Gerencia tokens de autenticação
- Tabela `user_activity_log`: Registra atividades dos usuários
- Usuário admin padrão: `admin` / `admin123`

### 2. Estrutura das Tabelas

#### users
- `id`: ID único do usuário
- `username`: Nome de usuário (único)
- `email`: Email (único)
- `password_hash`: Senha criptografada (bcrypt)
- `full_name`: Nome completo
- `is_admin`: Booleano indicando se é administrador
- `is_active`: Booleano indicando se está ativo
- `created_at`: Data de criação
- `updated_at`: Data da última atualização
- `last_login`: Data do último login
- `created_by`: ID do administrador que criou o usuário

#### user_sessions
- `id`: ID único da sessão
- `user_id`: Referência ao usuário
- `token`: Token de autenticação (64 caracteres)
- `expires_at`: Data de expiração do token
- `ip_address`: IP do cliente
- `user_agent`: User agent do navegador
- `created_at`: Data de criação

#### user_activity_log
- `id`: ID único do log
- `user_id`: Referência ao usuário
- `action`: Tipo de ação (login, logout, user_create, etc)
- `description`: Descrição da ação
- `ip_address`: IP do cliente
- `created_at`: Data da ação

## Endpoints de Autenticação

### POST /endpoints/auth.php/login
Realiza login no sistema.

**Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Resposta de sucesso:**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@system.local",
      "full_name": "Administrator",
      "is_admin": true,
      "is_active": true
    },
    "token": "abc123...",
    "expires_at": "2026-01-31 12:00:00"
  }
}
```

### POST /endpoints/auth.php/logout
Realiza logout do sistema.

**Headers:**
```
Authorization: Bearer {token}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

### GET /endpoints/auth.php/me
Retorna dados do usuário logado.

**Headers:**
```
Authorization: Bearer {token}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@system.local",
    "full_name": "Administrator",
    "is_admin": true,
    "is_active": true
  }
}
```

### POST /endpoints/auth.php/change-password
Altera senha do usuário logado.

**Headers:**
```
Authorization: Bearer {token}
```

**Body:**
```json
{
  "current_password": "senha_atual",
  "new_password": "nova_senha"
}
```

## Endpoints de Gerenciamento de Usuários (Apenas Admin)

### GET /endpoints/users.php
Lista todos os usuários.

**Headers:**
```
Authorization: Bearer {token}
```

**Query params:**
- `is_admin`: true/false - Filtrar por administradores
- `is_active`: true/false - Filtrar por status ativo
- `search`: string - Buscar por username, email ou nome

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@system.local",
      "full_name": "Administrator",
      "is_admin": true,
      "is_active": true,
      "created_at": "2026-01-30 10:00:00",
      "last_login": "2026-01-30 12:00:00"
    }
  ],
  "total": 1
}
```

### POST /endpoints/users.php
Cria novo usuário (apenas admin).

**Headers:**
```
Authorization: Bearer {token}
```

**Body:**
```json
{
  "username": "novo_usuario",
  "email": "usuario@email.com",
  "password": "senha123",
  "full_name": "Nome Completo",
  "is_admin": false
}
```

### GET /endpoints/users.php/{id}
Obtém dados de um usuário específico.

**Headers:**
```
Authorization: Bearer {token}
```

### PUT /endpoints/users.php/{id}
Atualiza dados de um usuário.

**Headers:**
```
Authorization: Bearer {token}
```

**Body:**
```json
{
  "full_name": "Novo Nome",
  "email": "novo@email.com",
  "is_active": true
}
```

### PUT /endpoints/users.php/{id}/toggle-admin
Promove/despromove usuário a administrador.

**Headers:**
```
Authorization: Bearer {token}
```

**Body:**
```json
{
  "is_admin": true
}
```

### PUT /endpoints/users.php/{id}/reset-password
Reseta senha de um usuário (apenas admin).

**Headers:**
```
Authorization: Bearer {token}
```

**Body:**
```json
{
  "new_password": "nova_senha123"
}
```

### DELETE /endpoints/users.php/{id}
Deleta um usuário (não pode deletar a si mesmo).

**Headers:**
```
Authorization: Bearer {token}
```

## Regras de Negócio

1. **Criação de Usuários:**
   - Apenas administradores podem criar usuários
   - Username e email devem ser únicos
   - Senha deve ter no mínimo 6 caracteres
   - Email deve ser válido

2. **Promoção a Admin:**
   - Apenas administradores podem promover outros usuários
   - Administrador não pode remover seus próprios privilégios

3. **Alteração de Senha:**
   - Todos os usuários podem alterar suas próprias senhas
   - Administradores podem resetar senhas de qualquer usuário
   - Usuário comum precisa fornecer senha atual para alterar

4. **Deleção de Usuários:**
   - Apenas administradores podem deletar usuários
   - Não é possível deletar a própria conta

5. **Sessões:**
   - Tokens expiram em 24 horas por padrão
   - Sessões expiradas são limpas automaticamente no login
   - Token deve ser enviado no header `Authorization: Bearer {token}`

6. **Segurança:**
   - Senhas são criptografadas com bcrypt
   - Todas as atividades são registradas em `user_activity_log`
   - Tokens são únicos de 64 caracteres (256 bits)

## Proteção de Endpoints Existentes

Para proteger endpoints existentes, adicione no início do arquivo PHP:

```php
require_once __DIR__ . '/../middleware/auth.php';

// Para endpoints que requerem apenas autenticação
$user = requireAuth($db);

// Para endpoints que requerem privilégios de admin
$admin = requireAdmin($db);
```

## Frontend

### 1. Context de Autenticação

O `AuthContext` fornece:
- `user`: Dados do usuário logado
- `token`: Token de autenticação
- `loading`: Estado de carregamento
- `login(username, password)`: Função de login
- `logout()`: Função de logout
- `changePassword(current, new)`: Alterar senha
- `isAdmin`: Booleano indicando se é admin
- `isAuthenticated`: Booleano indicando se está logado

### 2. Rotas Protegidas

Rotas protegidas redirecionam para login se não autenticado:

```jsx
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

<ProtectedRoute requireAdmin={true}>
  <Users />
</ProtectedRoute>
```

### 3. Páginas

- `/login`: Tela de login
- `/dashboard`: Dashboard principal (protegida)
- `/users`: Gerenciamento de usuários (apenas admin)
- Todas as páginas existentes foram convertidas para rotas protegidas

## Exemplos de Uso

### Login via curl

```bash
# Login
curl -X POST http://10.1.0.172:8090/endpoints/auth.php/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Usar o token retornado nos próximos requests
TOKEN="abc123..."

# Verificar sessão
curl -X GET http://10.1.0.172:8090/endpoints/auth.php/me \
  -H "Authorization: Bearer $TOKEN"

# Criar usuário
curl -X POST http://10.1.0.172:8090/endpoints/users.php \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "joao",
    "email": "joao@email.com",
    "password": "senha123",
    "full_name": "João Silva",
    "is_admin": false
  }'

# Listar usuários
curl -X GET http://10.1.0.172:8090/endpoints/users.php \
  -H "Authorization: Bearer $TOKEN"

# Promover a admin
curl -X PUT http://10.1.0.172:8090/endpoints/users.php/2/toggle-admin \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_admin": true}'

# Logout
curl -X POST http://10.1.0.172:8090/endpoints/auth.php/logout \
  -H "Authorization: Bearer $TOKEN"
```

## Credenciais Padrão

⚠️ **IMPORTANTE**: Altere as credenciais padrão após o primeiro login!

- **Username:** admin
- **Password:** admin123
- **Email:** admin@system.local

## Troubleshooting

### Token inválido ou expirado
- Verifique se o token está sendo enviado no header correto
- Tokens expiram em 24 horas
- Faça logout e login novamente

### Não consegue criar usuários
- Verifique se está logado como administrador
- Verifique se username/email já existe
- Senha deve ter no mínimo 6 caracteres

### Erro 401 em todos os endpoints
- Verifique se o token está válido
- Verifique se as tabelas foram criadas corretamente
- Verifique conexão com banco de dados
