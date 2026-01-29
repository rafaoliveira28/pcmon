<?php
require_once __DIR__ . '/../config/database.php';

try {
    $db = getDBConnection();
    
    echo "Criando tabelas de períodos de atividade...\n\n";
    
    // Criar tabela activity_periods
    $sql1 = "CREATE TABLE IF NOT EXISTS activity_periods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hostname VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        period_type ENUM('active', 'inactive') NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NULL,
        duration_seconds INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_hostname_username (hostname, username),
        INDEX idx_period_type (period_type),
        INDEX idx_start_time (start_time),
        INDEX idx_end_time (end_time),
        INDEX idx_composite (hostname, username, start_time, end_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $db->exec($sql1);
    echo "✓ Tabela 'activity_periods' criada com sucesso!\n";
    
    // Criar tabela daily_activity_summary
    $sql2 = "CREATE TABLE IF NOT EXISTS daily_activity_summary (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hostname VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        total_active_seconds INT DEFAULT 0,
        total_inactive_seconds INT DEFAULT 0,
        first_activity TIMESTAMP NULL,
        last_activity TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_daily (hostname, username, date),
        INDEX idx_date (date),
        INDEX idx_hostname_username (hostname, username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $db->exec($sql2);
    echo "✓ Tabela 'daily_activity_summary' criada com sucesso!\n\n";
    
    echo "Todas as tabelas foram criadas!\n";
    
} catch (PDOException $e) {
    echo "Erro: " . $e->getMessage() . "\n";
    exit(1);
}
