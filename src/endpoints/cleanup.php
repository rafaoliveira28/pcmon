<?php

/**
 * Endpoint para limpeza de dados do banco
 */

// Limpa TODOS os dados (TRUNCATE em todas as tabelas)
function cleanupAll($db) {
    try {
        // Lista de tabelas para limpar
        $tables = [
            'activity_events',
            'activity_periods',
            'daily_activity_summary',
            'last_mouse_activity', 
            'windows_snapshot',
            'user_sessions',
            'user_activity_log'
        ];
        
        // TRUNCATE faz commit implícito, não usa transação
        foreach ($tables as $table) {
            $stmt = $db->prepare("TRUNCATE TABLE `$table`");
            $stmt->execute();
        }
        
        return [
            'success' => true,
            'message' => 'Todos os dados foram removidos com sucesso',
            'tables_cleaned' => $tables
        ];
        
    } catch (PDOException $e) {
        http_response_code(500);
        return [
            'success' => false,
            'error' => 'Erro ao limpar dados: ' . $e->getMessage()
        ];
    }
}

// Limpa dados mais antigos que 30 dias
function cleanupOldData($db) {
    try {
        $deletedRows = [];
        
        $db->beginTransaction();
        
        // Limpar activity_events
        $stmt = $db->prepare("
            DELETE FROM activity_events 
            WHERE start_time < DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $stmt->execute();
        $deletedRows['activity_events'] = $stmt->rowCount();
        
        // Limpar activity_periods
        $stmt = $db->prepare("
            DELETE FROM activity_periods 
            WHERE start_time < DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $stmt->execute();
        $deletedRows['activity_periods'] = $stmt->rowCount();
        
        // Limpar daily_activity_summary
        $stmt = $db->prepare("
            DELETE FROM daily_activity_summary 
            WHERE date < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ");
        $stmt->execute();
        $deletedRows['daily_activity_summary'] = $stmt->rowCount();
        
        // Limpar last_mouse_activity
        $stmt = $db->prepare("
            DELETE FROM last_mouse_activity 
            WHERE last_activity < DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $stmt->execute();
        $deletedRows['last_mouse_activity'] = $stmt->rowCount();
        
        // Limpar windows_snapshot
        $stmt = $db->prepare("
            DELETE FROM windows_snapshot 
            WHERE timestamp < DATE_SUB(NOW(), INTERVAL 30 DAY)
        ");
        $stmt->execute();
        $deletedRows['windows_snapshot'] = $stmt->rowCount();
        
        $db->commit();
        
        $totalDeleted = array_sum($deletedRows);
        
        return [
            'success' => true,
            'message' => "Removidos $totalDeleted registros com mais de 30 dias",
            'deleted_by_table' => $deletedRows,
            'total_deleted' => $totalDeleted
        ];
        
    } catch (PDOException $e) {
        try {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
        } catch (Exception $rollbackEx) {
            // Ignora erro de rollback
        }
        http_response_code(500);
        return [
            'success' => false,
            'error' => 'Erro ao limpar dados antigos: ' . $e->getMessage()
        ];
    }
}
