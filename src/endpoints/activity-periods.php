<?php

// Registrar período de atividade/inatividade
function saveActivityPeriod($db, $data) {
    $required = ['hostname', 'username', 'period_type', 'start_time', 'end_time', 'duration_seconds'];
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
        // Verifica se existe período aberto do mesmo tipo para este usuário
        $sql = "SELECT id, start_time, period_type 
                FROM activity_periods 
                WHERE hostname = :hostname 
                AND username = :username 
                ORDER BY start_time DESC 
                LIMIT 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':hostname' => $data['hostname'],
            ':username' => $data['username']
        ]);
        
        $lastPeriod = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Se existe período anterior do MESMO tipo, faz UPDATE (checkpoint)
        if ($lastPeriod && $lastPeriod['period_type'] === $data['period_type']) {
            $sql = "UPDATE activity_periods 
                    SET end_time = :end_time,
                        duration_seconds = :duration_seconds,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = :id";
            
            $stmt = $db->prepare($sql);
            $stmt->execute([
                ':id' => $lastPeriod['id'],
                ':end_time' => $data['end_time'],
                ':duration_seconds' => $data['duration_seconds']
            ]);
            
            // Atualizar sumário diário (incremental)
            updateDailySummary($db, $data, $lastPeriod['start_time']);
            
            jsonResponse([
                'success' => true,
                'message' => 'Período atualizado (checkpoint)',
                'id' => $lastPeriod['id'],
                'updated' => true
            ], 200);
            
        } else {
            // Período novo ou mudança de tipo - faz INSERT
            $sql = "INSERT INTO activity_periods 
                    (hostname, username, period_type, start_time, end_time, duration_seconds) 
                    VALUES (:hostname, :username, :period_type, :start_time, :end_time, :duration_seconds)";
            
            $stmt = $db->prepare($sql);
            $stmt->execute([
                ':hostname' => $data['hostname'],
                ':username' => $data['username'],
                ':period_type' => $data['period_type'],
                ':start_time' => $data['start_time'],
                ':end_time' => $data['end_time'],
                ':duration_seconds' => $data['duration_seconds']
            ]);
            
            // Atualizar sumário diário
            updateDailySummary($db, $data, $data['start_time']);
            
            jsonResponse([
                'success' => true,
                'message' => 'Período registrado com sucesso',
                'id' => $db->lastInsertId(),
                'updated' => false
            ], 201);
        }
        
    } catch (PDOException $e) {
        error_log("Erro ao salvar período: " . $e->getMessage());
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao salvar período',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Atualizar sumário diário
function updateDailySummary($db, $data, $startTime) {
    try {
        $date = date('Y-m-d', strtotime($startTime));
        
        $sql = "INSERT INTO daily_activity_summary 
                (hostname, username, date, total_active_seconds, total_inactive_seconds, first_activity, last_activity) 
                VALUES (:hostname, :username, :date, 
                        CASE WHEN :period_type = 'active' THEN :duration ELSE 0 END,
                        CASE WHEN :period_type = 'inactive' THEN :duration ELSE 0 END,
                        :start_time, :end_time)
                ON DUPLICATE KEY UPDATE 
                    total_active_seconds = total_active_seconds + CASE WHEN :period_type2 = 'active' THEN :duration2 ELSE 0 END,
                    total_inactive_seconds = total_inactive_seconds + CASE WHEN :period_type2 = 'inactive' THEN :duration2 ELSE 0 END,
                    first_activity = LEAST(COALESCE(first_activity, :start_time2), :start_time2),
                    last_activity = GREATEST(COALESCE(last_activity, :end_time2), :end_time2),
                    updated_at = CURRENT_TIMESTAMP";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':hostname' => $data['hostname'],
            ':username' => $data['username'],
            ':date' => $date,
            ':period_type' => $data['period_type'],
            ':period_type2' => $data['period_type'],
            ':duration' => $data['duration_seconds'],
            ':duration2' => $data['duration_seconds'],
            ':start_time' => $startTime,
            ':start_time2' => $startTime,
            ':end_time' => $data['end_time'],
            ':end_time2' => $data['end_time']
        ]);
        
    } catch (PDOException $e) {
        error_log("Erro ao atualizar sumário diário: " . $e->getMessage());
    }
}

// Obter estatísticas de atividade/inatividade
function getActivityStatistics($db, $params) {
    try {
        $where = ['1=1'];
        $bindings = [];
        
        if (isset($params['hostname'])) {
            $where[] = "hostname = :hostname";
            $bindings[':hostname'] = $params['hostname'];
        }
        
        if (isset($params['username'])) {
            $where[] = "username = :username";
            $bindings[':username'] = $params['username'];
        }
        
        if (isset($params['date'])) {
            $where[] = "date = :date";
            $bindings[':date'] = $params['date'];
        } elseif (isset($params['start_date']) && isset($params['end_date'])) {
            $where[] = "date BETWEEN :start_date AND :end_date";
            $bindings[':start_date'] = $params['start_date'];
            $bindings[':end_date'] = $params['end_date'];
        } else {
            // Padrão: hoje
            $where[] = "date = CURDATE()";
        }
        
        $whereClause = 'WHERE ' . implode(' AND ', $where);
        
        $sql = "SELECT 
                    hostname,
                    username,
                    date,
                    total_active_seconds,
                    total_inactive_seconds,
                    (total_active_seconds + total_inactive_seconds) as total_seconds,
                    ROUND((total_active_seconds / (total_active_seconds + total_inactive_seconds)) * 100, 2) as active_percentage,
                    first_activity,
                    last_activity
                FROM daily_activity_summary
                $whereClause
                ORDER BY date DESC, hostname, username";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        jsonResponse([
            'success' => true,
            'data' => $results
        ], 200);
        
    } catch (PDOException $e) {
        error_log("Erro ao buscar estatísticas: " . $e->getMessage());
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar estatísticas',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Obter períodos com filtros de horário
function getActivityPeriods($db, $params) {
    try {
        $where = ['1=1'];
        $bindings = [];
        
        if (isset($params['hostname'])) {
            $where[] = "hostname = :hostname";
            $bindings[':hostname'] = $params['hostname'];
        }
        
        if (isset($params['username'])) {
            $where[] = "username = :username";
            $bindings[':username'] = $params['username'];
        }
        
        if (isset($params['period_type'])) {
            $where[] = "period_type = :period_type";
            $bindings[':period_type'] = $params['period_type'];
        }
        
        if (isset($params['start_date'])) {
            $where[] = "DATE(start_time) >= :start_date";
            $bindings[':start_date'] = $params['start_date'];
        }
        
        if (isset($params['end_date'])) {
            $where[] = "DATE(end_time) <= :end_date";
            $bindings[':end_date'] = $params['end_date'];
        }
        
        // Filtro de horário comercial (8:00 - 18:00)
        if (isset($params['business_hours']) && $params['business_hours'] === 'true') {
            $where[] = "(TIME(start_time) >= '08:00:00' AND TIME(start_time) < '18:00:00')";
        }
        
        // Filtro de ignorar horário específico
        if (isset($params['ignore_time_from']) && isset($params['ignore_time_to'])) {
            $where[] = "NOT (TIME(start_time) >= :ignore_from AND TIME(start_time) < :ignore_to)";
            $bindings[':ignore_from'] = $params['ignore_time_from'];
            $bindings[':ignore_to'] = $params['ignore_time_to'];
        }
        
        $whereClause = 'WHERE ' . implode(' AND ', $where);
        
        $sql = "SELECT 
                    id,
                    hostname,
                    username,
                    period_type,
                    start_time,
                    end_time,
                    duration_seconds
                FROM activity_periods
                $whereClause
                ORDER BY start_time DESC
                LIMIT 1000";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        jsonResponse([
            'success' => true,
            'data' => $results,
            'total' => count($results)
        ], 200);
        
    } catch (PDOException $e) {
        error_log("Erro ao buscar períodos: " . $e->getMessage());
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar períodos',
            'error' => $e->getMessage()
        ], 500);
    }
}
