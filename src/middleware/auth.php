<?php

/**
 * Middleware de autenticação e autorização
 */

// Verifica se há um token válido
function requireAuth($db) {
    $token = getBearerToken();
    
    if (!$token) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Token de autenticação não fornecido'
        ]);
        exit;
    }
    
    $user = validateToken($db, $token);
    
    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error' => 'Token inválido ou expirado'
        ]);
        exit;
    }
    
    return $user;
}

// Verifica se o usuário é administrador
function requireAdmin($db) {
    $user = requireAuth($db);
    
    if (!$user['is_admin']) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'error' => 'Acesso negado. Requer privilégios de administrador'
        ]);
        exit;
    }
    
    return $user;
}

// Extrai token Bearer do header Authorization
function getBearerToken() {
    $headers = getallheaders();
    
    if (isset($headers['Authorization'])) {
        $matches = [];
        if (preg_match('/Bearer\s+(.*)$/i', $headers['Authorization'], $matches)) {
            return $matches[1];
        }
    }
    
    return null;
}

// Valida token e retorna dados do usuário
function validateToken($db, $token) {
    try {
        $stmt = $db->prepare("
            SELECT u.*, s.expires_at
            FROM users u
            INNER JOIN user_sessions s ON u.id = s.user_id
            WHERE s.token = :token
            AND s.expires_at > NOW()
            AND u.is_active = TRUE
        ");
        
        $stmt->execute([':token' => $token]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return null;
        }
        
        // Remove dados sensíveis
        unset($user['password_hash']);
        unset($user['expires_at']);
        
        return $user;
        
    } catch (PDOException $e) {
        return null;
    }
}

// Gera token aleatório
function generateToken() {
    return bin2hex(random_bytes(32));
}

// Cria nova sessão
function createSession($db, $userId, $expiresInHours = 24) {
    $token = generateToken();
    $expiresAt = date('Y-m-d H:i:s', time() + ($expiresInHours * 3600));
    $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
    
    try {
        $stmt = $db->prepare("
            INSERT INTO user_sessions (user_id, token, expires_at, ip_address, user_agent)
            VALUES (:user_id, :token, :expires_at, :ip_address, :user_agent)
        ");
        
        $stmt->execute([
            ':user_id' => $userId,
            ':token' => $token,
            ':expires_at' => $expiresAt,
            ':ip_address' => $ipAddress,
            ':user_agent' => $userAgent
        ]);
        
        return [
            'token' => $token,
            'expires_at' => $expiresAt
        ];
        
    } catch (PDOException $e) {
        return null;
    }
}

// Remove sessão (logout)
function deleteSession($db, $token) {
    try {
        $stmt = $db->prepare("DELETE FROM user_sessions WHERE token = :token");
        $stmt->execute([':token' => $token]);
        return true;
    } catch (PDOException $e) {
        return false;
    }
}

// Remove sessões expiradas
function cleanExpiredSessions($db) {
    try {
        $stmt = $db->prepare("DELETE FROM user_sessions WHERE expires_at < NOW()");
        $stmt->execute();
        return true;
    } catch (PDOException $e) {
        return false;
    }
}

// Registra atividade do usuário
function logUserActivity($db, $userId, $action, $description = null) {
    try {
        $stmt = $db->prepare("
            INSERT INTO user_activity_log (user_id, action, description, ip_address)
            VALUES (:user_id, :action, :description, :ip_address)
        ");
        
        $stmt->execute([
            ':user_id' => $userId,
            ':action' => $action,
            ':description' => $description,
            ':ip_address' => $_SERVER['REMOTE_ADDR'] ?? null
        ]);
        
        return true;
    } catch (PDOException $e) {
        return false;
    }
}
