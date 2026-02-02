-- Tabela para executáveis ignorados no monitoramento
CREATE TABLE IF NOT EXISTS ignored_executables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    executable VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_executable (executable)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inserir alguns executáveis comuns do sistema para ignorar por padrão
INSERT IGNORE INTO ignored_executables (executable, description) VALUES
('svchost.exe', 'Windows Service Host'),
('explorer.exe', 'Windows Explorer'),
('dwm.exe', 'Desktop Window Manager'),
('taskhostw.exe', 'Windows Task Host'),
('SearchHost.exe', 'Windows Search'),
('RuntimeBroker.exe', 'Windows Runtime Broker');
