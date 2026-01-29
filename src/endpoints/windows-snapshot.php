<?php

// Salvar snapshot de janelas abertas
function saveWindowsSnapshot($db, $data) {
    // Log completo do que foi recebido
    file_put_contents('/tmp/snapshot_debug.log', date('Y-m-d H:i:s') . " | Recebido: " . json_encode($data) . "\n", FILE_APPEND);
    
    $required = ['hostname', 'username', 'timestamp', 'windows'];
    $missing = validateRequired($data, $required);
    
    if (!empty($missing)) {
        file_put_contents('/tmp/snapshot_debug.log', date('Y-m-d H:i:s') . " | ERRO - Campos faltando: " . json_encode($missing) . "\n", FILE_APPEND);
        jsonResponse([
            'success' => false,
            'message' => 'Campos obrigatórios ausentes',
            'missing_fields' => $missing
        ], 400);
        return;
    }
    
    file_put_contents('/tmp/snapshot_debug.log', date('Y-m-d H:i:s') . " | OK - Iniciando INSERT\n", FILE_APPEND);
    
    try {
        error_log("Iniciando saveWindowsSnapshot...");
        
        // Limpar snapshots antigos (mais de 5 minutos) deste computador
        $sqlClean = "DELETE FROM windows_snapshot 
                     WHERE hostname = :hostname 
                     AND username = :username 
                     AND timestamp < DATE_SUB(NOW(), INTERVAL 5 MINUTE)";
        $stmtClean = $db->prepare($sqlClean);
        $stmtClean->execute([
            ':hostname' => $data['hostname'],
            ':username' => $data['username']
        ]);
        
        error_log("Registros antigos deletados: " . $stmtClean->rowCount());
        
        // Converter windows para JSON
        $windowsJson = json_encode($data['windows']);
        error_log("JSON gerado com tamanho: " . strlen($windowsJson) . " bytes");
        
        // Inserir novo snapshot
        $sql = "INSERT INTO windows_snapshot (hostname, username, timestamp, windows_json) 
                VALUES (:hostname, :username, :timestamp, :windows_json)
                ON DUPLICATE KEY UPDATE 
                    timestamp = VALUES(timestamp),
                    windows_json = VALUES(windows_json)";
        
        error_log("Preparando INSERT com hostname=" . $data['hostname'] . " username=" . $data['username']);
        
        $stmt = $db->prepare($sql);
        $result = $stmt->execute([
            ':hostname' => $data['hostname'],
            ':username' => $data['username'],
            ':timestamp' => $data['timestamp'],
            ':windows_json' => $windowsJson
        ]);
        
        error_log("INSERT resultado: " . ($result ? 'sucesso' : 'falha') . " | Affected rows: " . $stmt->rowCount());
        
        jsonResponse([
            'success' => true,
            'message' => 'Snapshot salvo com sucesso',
            'windows_count' => count($data['windows'])
        ], 201);
        
    } catch (PDOException $e) {
        error_log("Erro ao salvar snapshot: " . $e->getMessage());
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao salvar snapshot',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Obter snapshot mais recente de janelas abertas
function getWindowsSnapshot($db, $hostname, $username) {
    try {
        $sql = "SELECT 
                    hostname,
                    username,
                    timestamp,
                    windows_json,
                    TIMESTAMPDIFF(SECOND, timestamp, NOW()) as seconds_ago
                FROM windows_snapshot 
                WHERE hostname = :hostname 
                AND username = :username
                AND timestamp > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                ORDER BY timestamp DESC 
                LIMIT 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':hostname' => $hostname,
            ':username' => $username
        ]);
        
        $snapshot = $stmt->fetch();
        
        if (!$snapshot) {
            jsonResponse([
                'success' => false,
                'message' => 'Nenhum snapshot recente encontrado'
            ], 404);
        }
        
        // Decodificar JSON de janelas
        $windows = json_decode($snapshot['windows_json'], true);
        
        // Separar janela ativa das outras
        $activeWindow = null;
        $otherWindows = [];
        
        foreach ($windows as $window) {
            if ($window['is_active']) {
                $activeWindow = $window;
            } else {
                $otherWindows[] = $window;
            }
        }
        
        jsonResponse([
            'success' => true,
            'data' => [
                'hostname' => $snapshot['hostname'],
                'username' => $snapshot['username'],
                'timestamp' => $snapshot['timestamp'],
                'seconds_ago' => $snapshot['seconds_ago'],
                'active_window' => $activeWindow,
                'other_windows' => $otherWindows,
                'total_windows' => count($windows)
            ]
        ]);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar snapshot',
            'error' => $e->getMessage()
        ], 500);
    }
}
