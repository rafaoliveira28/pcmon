-- Tabela para armazenar snapshots de janelas abertas em tempo real
CREATE TABLE IF NOT EXISTS `windows_snapshot` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `hostname` VARCHAR(255) NOT NULL,
  `username` VARCHAR(255) NOT NULL,
  `timestamp` DATETIME NOT NULL,
  `windows_json` JSON NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_computer` (`hostname`, `username`),
  INDEX `idx_timestamp` (`timestamp`),
  INDEX `idx_hostname_username` (`hostname`, `username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Limpar snapshots antigos (mais de 5 minutos) automaticamente
-- Você pode rodar este comando periodicamente ou criar um evento
-- DELETE FROM windows_snapshot WHERE timestamp < DATE_SUB(NOW(), INTERVAL 5 MINUTE);
