<?php

// Salvar última atividade do mouse/teclado
function saveMouseActivity($db, $data) {
    $required = ['hostname', 'username', 'last_activity'];
    $missing = validateRequired($data, $required);
    
    if (!empty($missing)) {
        jsonResponse([
            'success' => false,
            'message' => 'Campos obrigatórios ausentes',
            'missing_fields' => $missing
        ], 400);
        return;
    }
    
    try {
        $sql = "INSERT INTO last_mouse_activity (hostname, username, last_activity) 
                VALUES (:hostname, :username, :last_activity)
                ON DUPLICATE KEY UPDATE 
                    last_activity = VALUES(last_activity),
                    updated_at = CURRENT_TIMESTAMP";
        
        $stmt = $db->prepare($sql);
        $result = $stmt->execute([
            ':hostname' => $data['hostname'],
            ':username' => $data['username'],
            ':last_activity' => $data['last_activity']
        ]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Mouse activity atualizada'
        ], 200);
        
    } catch (PDOException $e) {
        error_log("Erro ao salvar mouse activity: " . $e->getMessage());
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao salvar mouse activity',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Obter status de atividade de todos os computadores
function getComputersActivityStatus($db) {
    try {
        // Nova lógica: offline = sem snapshot, inactive = sem input mas com snapshot, active = com input
        $sql = "SELECT 
                    ma.hostname,
                    ma.username,
                    ma.last_activity,
                    TIMESTAMPDIFF(SECOND, ma.last_activity, NOW()) as seconds_since_activity,
                    CASE 
                        -- Offline: sem snapshot de telas nos últimos 5 minutos
                        WHEN ws.timestamp IS NULL THEN 'offline'
                        -- Ativo: input (mouse/teclado) < 60 segundos
                        WHEN TIMESTAMPDIFF(SECOND, ma.last_activity, NOW()) < 60 THEN 'active'
                        -- Inativo: input > 60 segundos mas tem snapshot de telas
                        ELSE 'inactive'
                    END as status
                FROM last_mouse_activity ma
                LEFT JOIN windows_snapshot ws ON ma.hostname = ws.hostname AND ma.username = ws.username
                    AND ws.timestamp > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                ORDER BY ma.last_activity DESC";
        
        $stmt = $db->query($sql);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        jsonResponse([
            'success' => true,
            'data' => $results
        ], 200);
        
    } catch (PDOException $e) {
        error_log("Erro ao buscar status de atividade: " . $e->getMessage());
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar status de atividade',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Obter status de atividade de um computador específico
function getComputerActivityStatus($db, $hostname, $username) {
    try {
        $sql = "SELECT 
                    ma.hostname,
                    ma.username,
                    ma.last_activity,
                    TIMESTAMPDIFF(SECOND, ma.last_activity, NOW()) as seconds_since_activity,
                    CASE 
                        -- Offline: sem snapshot de telas nos últimos 5 minutos
                        WHEN ws.timestamp IS NULL THEN 'offline'
                        -- Ativo: input (mouse/teclado) < 60 segundos
                        WHEN TIMESTAMPDIFF(SECOND, ma.last_activity, NOW()) < 60 THEN 'active'
                        -- Inativo: input > 60 segundos mas tem snapshot de telas
                        ELSE 'inactive'
                    END as status
                FROM last_mouse_activity ma
                LEFT JOIN windows_snapshot ws ON ma.hostname = ws.hostname AND ma.username = ws.username
                    AND ws.timestamp > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                WHERE ma.hostname = :hostname AND ma.username = :username";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':hostname' => $hostname,
            ':username' => $username
        ]);
        
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result) {
            jsonResponse([
                'success' => true,
                'data' => $result
            ], 200);
        } else {
            jsonResponse([
                'success' => false,
                'message' => 'Nenhuma atividade encontrada para este computador',
                'data' => [
                    'hostname' => $hostname,
                    'username' => $username,
                    'status' => 'unknown',
                    'seconds_since_activity' => null
                ]
            ], 404);
        }
        
    } catch (PDOException $e) {
        error_log("Erro ao buscar status de atividade: " . $e->getMessage());
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar status de atividade',
            'error' => $e->getMessage()
        ], 500);
    }
}
