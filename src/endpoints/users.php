<?php

/**
 * Endpoints de gerenciamento de usuários (apenas admin)
 */

require_once __DIR__ . '/../middleware/auth.php';

// Listar todos os usuários (admin)
function listUsers($db, $params) {
    requireAdmin($db);
    
    try {
        $where = ['1=1'];
        $bindings = [];
        
        if (isset($params['is_admin'])) {
            $where[] = "is_admin = :is_admin";
            $bindings[':is_admin'] = $params['is_admin'] === 'true' ? 1 : 0;
        }
        
        if (isset($params['is_active'])) {
            $where[] = "is_active = :is_active";
            $bindings[':is_active'] = $params['is_active'] === 'true' ? 1 : 0;
        }
        
        if (isset($params['search'])) {
            $where[] = "(username LIKE :search OR email LIKE :search OR full_name LIKE :search)";
            $bindings[':search'] = '%' . $params['search'] . '%';
        }
        
        $whereClause = 'WHERE ' . implode(' AND ', $where);
        
        $stmt = $db->prepare("
            SELECT id, username, email, full_name, is_admin, is_active, 
                   created_at, updated_at, last_login
            FROM users
            $whereClause
            ORDER BY created_at DESC
        ");
        
        $stmt->execute($bindings);
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'data' => $users,
            'total' => count($users)
        ];
        
    } catch (PDOException $e) {
        http_response_code(500);
        return [
            'success' => false,
            'error' => 'Erro ao listar usuários: ' . $e->getMessage()
        ];
    }
}

// Criar novo usuário (admin)
function createUser($db, $data) {
    $admin = requireAdmin($db);
    
    $required = ['username', 'email', 'password', 'full_name'];
    $missing = array_filter($required, fn($field) => !isset($data[$field]));
    
    if (!empty($missing)) {
        http_response_code(400);
        return [
            'success' => false,
            'error' => 'Campos obrigatórios ausentes',
            'missing_fields' => array_values($missing)
        ];
    }
    
    if (strlen($data['password']) < 6) {
        http_response_code(400);
        return [
            'success' => false,
            'error' => 'Senha deve ter no mínimo 6 caracteres'
        ];
    }
    
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        return [
            'success' => false,
            'error' => 'Email inválido'
        ];
    }
    
    try {
        // Verificar se username ou email já existe
        $stmt = $db->prepare("SELECT id FROM users WHERE username = :username OR email = :email");
        $stmt->execute([
            ':username' => $data['username'],
            ':email' => $data['email']
        ]);
        
        if ($stmt->fetch()) {
            http_response_code(409);
            return [
                'success' => false,
                'error' => 'Username ou email já cadastrado'
            ];
        }
        
        // Criar usuário
        $passwordHash = password_hash($data['password'], PASSWORD_DEFAULT);
        $isAdmin = isset($data['is_admin']) && $data['is_admin'] === true ? 1 : 0;
        
        $stmt = $db->prepare("
            INSERT INTO users (username, email, password_hash, full_name, is_admin, created_by)
            VALUES (:username, :email, :password_hash, :full_name, :is_admin, :created_by)
        ");
        
        $stmt->execute([
            ':username' => $data['username'],
            ':email' => $data['email'],
            ':password_hash' => $passwordHash,
            ':full_name' => $data['full_name'],
            ':is_admin' => $isAdmin,
            ':created_by' => $admin['id']
        ]);
        
        $userId = $db->lastInsertId();
        
        logUserActivity($db, $admin['id'], 'user_create', "Criou usuário: {$data['username']}");
        
        return [
            'success' => true,
            'message' => 'Usuário criado com sucesso',
            'data' => [
                'id' => $userId,
                'username' => $data['username'],
                'email' => $data['email'],
                'full_name' => $data['full_name'],
                'is_admin' => (bool)$isAdmin
            ]
        ];
        
    } catch (PDOException $e) {
        http_response_code(500);
        return [
            'success' => false,
            'error' => 'Erro ao criar usuário: ' . $e->getMessage()
        ];
    }
}

// Obter usuário específico (admin)
function getUser($db, $userId) {
    requireAdmin($db);
    
    try {
        $stmt = $db->prepare("
            SELECT id, username, email, full_name, is_admin, is_active,
                   created_at, updated_at, last_login, created_by
            FROM users
            WHERE id = :id
        ");
        
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            return [
                'success' => false,
                'error' => 'Usuário não encontrado'
            ];
        }
        
        return [
            'success' => true,
            'data' => $user
        ];
        
    } catch (PDOException $e) {
        http_response_code(500);
        return [
            'success' => false,
            'error' => 'Erro ao buscar usuário: ' . $e->getMessage()
        ];
    }
}

// Atualizar usuário (admin)
function updateUser($db, $userId, $data) {
    $admin = requireAdmin($db);
    
    try {
        // Verificar se usuário existe
        $stmt = $db->prepare("SELECT id, username FROM users WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            return [
                'success' => false,
                'error' => 'Usuário não encontrado'
            ];
        }
        
        $updates = [];
        $bindings = [':id' => $userId];
        
        if (isset($data['full_name'])) {
            $updates[] = "full_name = :full_name";
            $bindings[':full_name'] = $data['full_name'];
        }
        
        if (isset($data['email'])) {
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                http_response_code(400);
                return ['success' => false, 'error' => 'Email inválido'];
            }
            $updates[] = "email = :email";
            $bindings[':email'] = $data['email'];
        }
        
        if (isset($data['is_active'])) {
            $updates[] = "is_active = :is_active";
            $bindings[':is_active'] = $data['is_active'] ? 1 : 0;
        }
        
        if (empty($updates)) {
            http_response_code(400);
            return [
                'success' => false,
                'error' => 'Nenhum campo para atualizar'
            ];
        }
        
        $stmt = $db->prepare("
            UPDATE users 
            SET " . implode(', ', $updates) . "
            WHERE id = :id
        ");
        
        $stmt->execute($bindings);
        
        logUserActivity($db, $admin['id'], 'user_update', "Atualizou usuário ID: $userId");
        
        return [
            'success' => true,
            'message' => 'Usuário atualizado com sucesso'
        ];
        
    } catch (PDOException $e) {
        http_response_code(500);
        return [
            'success' => false,
            'error' => 'Erro ao atualizar usuário: ' . $e->getMessage()
        ];
    }
}

// Promover/despromover administrador (admin)
function toggleAdmin($db, $userId, $data) {
    $admin = requireAdmin($db);
    
    if (!isset($data['is_admin'])) {
        http_response_code(400);
        return [
            'success' => false,
            'error' => 'Campo is_admin é obrigatório'
        ];
    }
    
    try {
        // Não pode remover próprio admin
        if ($userId == $admin['id'] && !$data['is_admin']) {
            http_response_code(400);
            return [
                'success' => false,
                'error' => 'Você não pode remover seus próprios privilégios de administrador'
            ];
        }
        
        $stmt = $db->prepare("UPDATE users SET is_admin = :is_admin WHERE id = :id");
        $stmt->execute([
            ':is_admin' => $data['is_admin'] ? 1 : 0,
            ':id' => $userId
        ]);
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            return [
                'success' => false,
                'error' => 'Usuário não encontrado'
            ];
        }
        
        $action = $data['is_admin'] ? 'promovido a' : 'removido de';
        logUserActivity($db, $admin['id'], 'user_admin_toggle', "Usuário ID $userId $action administrador");
        
        return [
            'success' => true,
            'message' => 'Privilégios de administrador atualizados com sucesso'
        ];
        
    } catch (PDOException $e) {
        http_response_code(500);
        return [
            'success' => false,
            'error' => 'Erro ao atualizar privilégios: ' . $e->getMessage()
        ];
    }
}

// Resetar senha de usuário (admin)
function resetPassword($db, $userId, $data) {
    $admin = requireAdmin($db);
    
    if (!isset($data['new_password'])) {
        http_response_code(400);
        return [
            'success' => false,
            'error' => 'Campo new_password é obrigatório'
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
        $passwordHash = password_hash($data['new_password'], PASSWORD_DEFAULT);
        
        $stmt = $db->prepare("UPDATE users SET password_hash = :password_hash WHERE id = :id");
        $stmt->execute([
            ':password_hash' => $passwordHash,
            ':id' => $userId
        ]);
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            return [
                'success' => false,
                'error' => 'Usuário não encontrado'
            ];
        }
        
        logUserActivity($db, $admin['id'], 'password_reset', "Resetou senha do usuário ID: $userId");
        
        return [
            'success' => true,
            'message' => 'Senha resetada com sucesso'
        ];
        
    } catch (PDOException $e) {
        http_response_code(500);
        return [
            'success' => false,
            'error' => 'Erro ao resetar senha: ' . $e->getMessage()
        ];
    }
}

// Deletar registros de atividade de um usuário (admin)
function deleteUserRecords($db, $userId) {
    $admin = requireAdmin($db);
    
    try {
        // Buscar informações do usuário
        $stmt = $db->prepare("SELECT username FROM users WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            http_response_code(404);
            return [
                'success' => false,
                'error' => 'Usuário não encontrado'
            ];
        }
        
        $username = $user['username'];
        $deletedRows = [];
        
        $db->beginTransaction();
        
        // Deletar de todas as tabelas de atividade
        $tables = [
            'activity_events',
            'activity_periods',
            'daily_activity_summary',
            'last_mouse_activity',
            'windows_snapshot'
        ];
        
        foreach ($tables as $table) {
            $stmt = $db->prepare("DELETE FROM `$table` WHERE username = :username");
            $stmt->execute([':username' => $username]);
            $deletedRows[$table] = $stmt->rowCount();
        }
        
        $db->commit();
        
        $totalDeleted = array_sum($deletedRows);
        
        logUserActivity($db, $admin['id'], 'user_records_delete', 
            "Deletou $totalDeleted registros de atividade do usuário: $username");
        
        return [
            'success' => true,
            'message' => "Registros de atividade deletados com sucesso",
            'deleted_by_table' => $deletedRows,
            'total_deleted' => $totalDeleted
        ];
        
    } catch (PDOException $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        http_response_code(500);
        return [
            'success' => false,
            'error' => 'Erro ao deletar registros: ' . $e->getMessage()
        ];
    }
}

// Deletar usuário (admin)
function deleteUser($db, $userId) {
    $admin = requireAdmin($db);
    
    // Não pode deletar a si mesmo
    if ($userId == $admin['id']) {
        http_response_code(400);
        return [
            'success' => false,
            'error' => 'Você não pode deletar sua própria conta'
        ];
    }
    
    try {
        $stmt = $db->prepare("DELETE FROM users WHERE id = :id");
        $stmt->execute([':id' => $userId]);
        
        if ($stmt->rowCount() === 0) {
            http_response_code(404);
            return [
                'success' => false,
                'error' => 'Usuário não encontrado'
            ];
        }
        
        logUserActivity($db, $admin['id'], 'user_delete', "Deletou usuário ID: $userId");
        
        return [
            'success' => true,
            'message' => 'Usuário deletado com sucesso'
        ];
        
    } catch (PDOException $e) {
        http_response_code(500);
        return [
            'success' => false,
            'error' => 'Erro ao deletar usuário: ' . $e->getMessage()
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

// Parse ID from path
$pathParts = explode('/', trim($path, '/'));
$userId = isset($pathParts[0]) && is_numeric($pathParts[0]) ? (int)$pathParts[0] : null;
$action = $pathParts[1] ?? null;

if ($userId && $action) {
    // /users/{id}/{action}
    switch ($action) {
        case 'toggle-admin':
            $result = ($method === 'PUT') ? toggleAdmin($db, $userId, $data) : ['success' => false, 'error' => 'Método não permitido'];
            break;
        case 'reset-password':
            $result = ($method === 'PUT') ? resetPassword($db, $userId, $data) : ['success' => false, 'error' => 'Método não permitido'];
            break;
        case 'delete-records':
            $result = ($method === 'DELETE') ? deleteUserRecords($db, $userId) : ['success' => false, 'error' => 'Método não permitido'];
            break;
        default:
            http_response_code(404);
            $result = ['success' => false, 'error' => 'Ação não encontrada'];
    }
} elseif ($userId) {
    // /users/{id}
    switch ($method) {
        case 'GET':
            $result = getUser($db, $userId);
            break;
        case 'PUT':
            $result = updateUser($db, $userId, $data);
            break;
        case 'DELETE':
            $result = deleteUser($db, $userId);
            break;
        default:
            http_response_code(405);
            $result = ['success' => false, 'error' => 'Método não permitido'];
    }
} else {
    // /users
    switch ($method) {
        case 'GET':
            $result = listUsers($db, $_GET);
            break;
        case 'POST':
            $result = createUser($db, $data);
            break;
        default:
            http_response_code(405);
            $result = ['success' => false, 'error' => 'Método não permitido'];
    }
}

echo json_encode($result, JSON_PRETTY_PRINT);
