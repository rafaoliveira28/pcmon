<?php

/**
 * Endpoints de autenticação
 */

require_once __DIR__ . '/../middleware/auth.php';

// Login
function login($db, $data) {
    if (!isset($data['username']) || !isset($data['password'])) {
        http_response_code(400);
        return [
            'success' => false,
            'error' => 'Username e password são obrigatórios'
        ];
    }
    
    try {
        // Buscar usuário
        $stmt = $db->prepare("
            SELECT id, username, email, password_hash, full_name, is_admin, is_active
            FROM users
            WHERE username = :username OR email = :username
        ");
        
        $stmt->execute([':username' => $data['username']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(401);
            return [
                'success' => false,
                'error' => 'Credenciais inválidas'
            ];
        }
        
        // Verificar se usuário está ativo
        if (!$user['is_active']) {
            http_response_code(403);
            return [
                'success' => false,
                'error' => 'Usuário desativado'
            ];
        }
        
        // Verificar senha
        if (!password_verify($data['password'], $user['password_hash'])) {
            http_response_code(401);
            logUserActivity($db, $user['id'], 'login_failed', 'Senha incorreta');
            return [
                'success' => false,
                'error' => 'Credenciais inválidas'
            ];
        }
        
        // Limpar sessões expiradas
        cleanExpiredSessions($db);
        
        // Criar nova sessão
        $session = createSession($db, $user['id']);
        
        if (!$session) {
            http_response_code(500);
            return [
                'success' => false,
                'error' => 'Erro ao criar sessão'
            ];
        }
        
        // Atualizar último login
        $stmt = $db->prepare("UPDATE users SET last_login = NOW() WHERE id = :id");
        $stmt->execute([':id' => $user['id']]);
        
        // Log de atividade
        logUserActivity($db, $user['id'], 'login', 'Login bem-sucedido');
        
        // Remover senha do retorno
        unset($user['password_hash']);
        
        return [
            'success' => true,
            'message' => 'Login realizado com sucesso',
            'data' => [
                'user' => $user,
                'token' => $session['token'],
                'expires_at' => $session['expires_at']
            ]
        ];
        
    } catch (PDOException $e) {
        http_response_code(500);
        return [
            'success' => false,
            'error' => 'Erro no servidor: ' . $e->getMessage()
        ];
    }
}

// Logout
function logout($db) {
    $token = getBearerToken();
    
    if (!$token) {
        http_response_code(400);
        return [
            'success' => false,
            'error' => 'Token não fornecido'
        ];
    }
    
    $user = validateToken($db, $token);
    
    if ($user) {
        logUserActivity($db, $user['id'], 'logout', 'Logout realizado');
    }
    
    deleteSession($db, $token);
    
    return [
        'success' => true,
        'message' => 'Logout realizado com sucesso'
    ];
}

// Verificar sessão atual
function me($db) {
    $user = requireAuth($db);
    
    return [
        'success' => true,
        'data' => $user
    ];
}

// Alterar própria senha
function changePassword($db, $data) {
    $user = requireAuth($db);
    
    if (!isset($data['current_password']) || !isset($data['new_password'])) {
        http_response_code(400);
        return [
            'success' => false,
            'error' => 'current_password e new_password são obrigatórios'
        ];
    }
    
    if (strlen($data['new_password']) < 6) {
        http_response_code(400);
        return [
            'success' => false,
            'error' => 'Nova senha deve ter no mínimo 6 caracteres'
        ];
    }
    
    try {
        // Verificar senha atual
        $stmt = $db->prepare("SELECT password_hash FROM users WHERE id = :id");
        $stmt->execute([':id' => $user['id']]);
        $currentUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!password_verify($data['current_password'], $currentUser['password_hash'])) {
            http_response_code(401);
            return [
                'success' => false,
                'error' => 'Senha atual incorreta'
            ];
        }
        
        // Atualizar senha
        $newPasswordHash = password_hash($data['new_password'], PASSWORD_DEFAULT);
        
        $stmt = $db->prepare("UPDATE users SET password_hash = :password_hash WHERE id = :id");
        $stmt->execute([
            ':password_hash' => $newPasswordHash,
            ':id' => $user['id']
        ]);
        
        logUserActivity($db, $user['id'], 'password_change', 'Senha alterada');
        
        return [
            'success' => true,
            'message' => 'Senha alterada com sucesso'
        ];
        
    } catch (PDOException $e) {
        http_response_code(500);
        return [
            'success' => false,
            'error' => 'Erro ao alterar senha: ' . $e->getMessage()
        ];
    }
}

// Roteamento
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

$db = getDBConnection();
$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['PATH_INFO'] ?? '/';
$data = json_decode(file_get_contents('php://input'), true) ?? [];

switch ($path) {
    case '/login':
        if ($method !== 'POST') {
            http_response_code(405);
            $result = ['success' => false, 'error' => 'Método não permitido'];
        } else {
            $result = login($db, $data);
        }
        break;
        
    case '/logout':
        if ($method !== 'POST') {
            http_response_code(405);
            $result = ['success' => false, 'error' => 'Método não permitido'];
        } else {
            $result = logout($db);
        }
        break;
        
    case '/me':
        if ($method !== 'GET') {
            http_response_code(405);
            $result = ['success' => false, 'error' => 'Método não permitido'];
        } else {
            $result = me($db);
        }
        break;
        
    case '/change-password':
        if ($method !== 'POST') {
            http_response_code(405);
            $result = ['success' => false, 'error' => 'Método não permitido'];
        } else {
            $result = changePassword($db, $data);
        }
        break;
        
    default:
        http_response_code(404);
        $result = [
            'success' => false,
            'error' => 'Endpoint não encontrado',
            'available_endpoints' => [
                'POST /auth/login' => 'Fazer login',
                'POST /auth/logout' => 'Fazer logout',
                'GET /auth/me' => 'Ver dados do usuário logado',
                'POST /auth/change-password' => 'Alterar própria senha'
            ]
        ];
}

echo json_encode($result, JSON_PRETTY_PRINT);
