<?php
// Configurações de conexão com o banco de dados
define('DB_HOST', getenv('DB_HOST') ?: '10.1.3.173');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'unimonitor');
define('DB_USER', getenv('DB_USER') ?: 'UNIAGENTE');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: 'U@1nM0n!');

// Configurações da API
define('API_VERSION', 'v1');
define('TIMEZONE', 'America/Sao_Paulo');

// Configurar timezone
date_default_timezone_set(TIMEZONE);

// Função para conectar ao banco de dados
function getDBConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $pdo = new PDO($dsn, DB_USER, DB_PASSWORD);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Erro de conexão com o banco de dados',
            'error' => $e->getMessage()
        ]);
        exit;
    }
}

// Função para retornar resposta JSON
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Função para validar dados obrigatórios
function validateRequired($data, $requiredFields) {
    $missing = [];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field])) {
            $missing[] = $field;
        } elseif (is_string($data[$field]) && trim($data[$field]) === '') {
            $missing[] = $field;
        } elseif (is_array($data[$field]) && empty($data[$field])) {
            $missing[] = $field;
        }
    }
    return $missing;
}
