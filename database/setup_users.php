<?php

/**
 * Script para criar tabelas de autenticação
 * Execute: php database/setup_users.php
 */

require_once __DIR__ . '/../config/database.php';

try {
    $db = getDBConnection();
    
    echo "Conectado ao banco de dados!\n\n";
    
    // Criar tabela users
    echo "Criando tabela 'users'...\n";
    $db->exec("
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(100) NOT NULL,
            is_admin TINYINT(1) DEFAULT 0,
            is_active TINYINT(1) DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            last_login TIMESTAMP NULL,
            created_by INT NULL,
            INDEX idx_username (username),
            INDEX idx_email (email),
            INDEX idx_is_admin (is_admin),
            INDEX idx_is_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✓ Tabela 'users' criada com sucesso!\n\n";
    
    // Criar tabela user_sessions
    echo "Criando tabela 'user_sessions'...\n";
    $db->exec("
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token VARCHAR(64) NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            ip_address VARCHAR(45) NULL,
            user_agent VARCHAR(255) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_token (token),
            INDEX idx_user_id (user_id),
            INDEX idx_expires_at (expires_at),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✓ Tabela 'user_sessions' criada com sucesso!\n\n";
    
    // Criar tabela user_activity_log
    echo "Criando tabela 'user_activity_log'...\n";
    $db->exec("
        CREATE TABLE IF NOT EXISTS user_activity_log (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            action VARCHAR(50) NOT NULL,
            description TEXT NULL,
            ip_address VARCHAR(45) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_action (action),
            INDEX idx_created_at (created_at),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "✓ Tabela 'user_activity_log' criada com sucesso!\n\n";
    
    // Adicionar FK created_by (se não existir)
    echo "Adicionando constraint 'fk_users_created_by'...\n";
    try {
        $db->exec("
            ALTER TABLE users
            ADD CONSTRAINT fk_users_created_by
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        ");
        echo "✓ Constraint adicionada com sucesso!\n\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate key') !== false || strpos($e->getMessage(), 'already exists') !== false) {
            echo "⚠ Constraint já existe (ignorado)\n\n";
        } else {
            throw $e;
        }
    }
    
    // Criar usuário admin padrão
    echo "Criando usuário administrador padrão...\n";
    
    // Verificar se já existe
    $stmt = $db->query("SELECT COUNT(*) FROM users WHERE username = 'admin'");
    $count = $stmt->fetchColumn();
    
    if ($count > 0) {
        echo "⚠ Usuário 'admin' já existe!\n\n";
    } else {
        // Gerar hash da senha admin123
        $passwordHash = password_hash('admin123', PASSWORD_DEFAULT);
        
        $stmt = $db->prepare("
            INSERT INTO users (username, email, password_hash, full_name, is_admin, is_active)
            VALUES (:username, :email, :password_hash, :full_name, :is_admin, :is_active)
        ");
        
        $stmt->execute([
            ':username' => 'admin',
            ':email' => 'admin@system.local',
            ':password_hash' => $passwordHash,
            ':full_name' => 'Administrator',
            ':is_admin' => 1,
            ':is_active' => 1
        ]);
        
        echo "✓ Usuário 'admin' criado com sucesso!\n";
        echo "  Username: admin\n";
        echo "  Password: admin123\n";
        echo "  ⚠ IMPORTANTE: Altere a senha após o primeiro login!\n\n";
    }
    
    echo "========================================\n";
    echo "✓ Setup concluído com sucesso!\n";
    echo "========================================\n\n";
    
    // Mostrar resumo das tabelas
    echo "Tabelas criadas:\n";
    $tables = ['users', 'user_sessions', 'user_activity_log'];
    foreach ($tables as $table) {
        $stmt = $db->query("SELECT COUNT(*) FROM $table");
        $count = $stmt->fetchColumn();
        echo "  - $table: $count registros\n";
    }
    
} catch (PDOException $e) {
    echo "\n❌ ERRO: " . $e->getMessage() . "\n";
    exit(1);
}
