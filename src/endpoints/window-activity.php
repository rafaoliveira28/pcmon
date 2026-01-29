<?php

// Criar nova atividade de janela
function createWindowActivity($db, $data) {
    $required = ['hostname', 'username', 'executable', 'pid', 'start_time'];
    $missing = validateRequired($data, $required);
    
    if (!empty($missing)) {
        jsonResponse([
            'success' => false,
            'message' => 'Campos obrigatórios ausentes',
            'missing_fields' => $missing
        ], 400);
    }
    
    try {
        $sql = "INSERT INTO activity_events 
                (hostname, username, executable, pid, window_title, start_time, end_time, duration_seconds) 
                VALUES (:hostname, :username, :executable, :pid, :window_title, :start_time, :end_time, :duration_seconds)";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':hostname' => $data['hostname'],
            ':username' => $data['username'],
            ':executable' => $data['executable'],
            ':pid' => $data['pid'],
            ':window_title' => $data['window_title'] ?? null,
            ':start_time' => $data['start_time'],
            ':end_time' => $data['end_time'] ?? null,
            ':duration_seconds' => $data['duration_seconds'] ?? $data['duration_second'] ?? null
        ]);
        
        $activityId = $db->lastInsertId();
        
        // Atualizar última atividade do computador
        updateComputerActivity($db, $data['hostname'], $data['username']);
        
        jsonResponse([
            'success' => true,
            'message' => 'Atividade registrada com sucesso',
            'data' => [
                'id' => $activityId,
                'hostname' => $data['hostname'],
                'username' => $data['username']
            ]
        ], 201);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao registrar atividade',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Listar atividades com filtros
function getWindowActivities($db, $params) {
    try {
        $where = [];
        $bindings = [];
        
        if (isset($params['hostname'])) {
            $where[] = "hostname = :hostname";
            $bindings[':hostname'] = $params['hostname'];
        }
        
        if (isset($params['username'])) {
            $where[] = "username = :username";
            $bindings[':username'] = $params['username'];
        }
        
        if (isset($params['executable'])) {
            $where[] = "executable LIKE :executable";
            $bindings[':executable'] = '%' . $params['executable'] . '%';
        }
        
        if (isset($params['date'])) {
            $where[] = "DATE(start_time) = :date";
            $bindings[':date'] = $params['date'];
        }
        
        // Filtro de período de datas
        if (isset($params['startDate'])) {
            $where[] = "DATE(start_time) >= :start_date";
            $bindings[':start_date'] = $params['startDate'];
        }
        
        if (isset($params['endDate'])) {
            $where[] = "DATE(start_time) <= :end_date";
            $bindings[':end_date'] = $params['endDate'];
        }
        
        // Filtro de horário comercial (8:00 - 18:00)
        if (isset($params['businessHours']) && $params['businessHours'] === 'true') {
            $where[] = "(TIME(start_time) >= '08:00:00' AND TIME(start_time) < '18:00:00')";
        }
        
        // Filtro de horário personalizado
        if (isset($params['startTime']) && !empty($params['startTime'])) {
            $where[] = "TIME(start_time) >= :start_time";
            $bindings[':start_time'] = $params['startTime'];
        }
        
        if (isset($params['endTime']) && !empty($params['endTime'])) {
            $where[] = "TIME(start_time) < :end_time";
            $bindings[':end_time'] = $params['endTime'];
        }
        
        // Filtro para ignorar horário específico (ex: almoço)
        if (isset($params['ignoreTimeFrom']) && isset($params['ignoreTimeTo']) && 
            !empty($params['ignoreTimeFrom']) && !empty($params['ignoreTimeTo'])) {
            $where[] = "NOT (TIME(start_time) >= :ignore_from AND TIME(start_time) < :ignore_to)";
            $bindings[':ignore_from'] = $params['ignoreTimeFrom'];
            $bindings[':ignore_to'] = $params['ignoreTimeTo'];
        }
        
        // Paginação
        $page = isset($params['page']) ? (int)$params['page'] : 1;
        $limit = isset($params['limit']) ? (int)$params['limit'] : 50;
        $offset = ($page - 1) * $limit;
        
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        
        // Calcular totais de tempo (ativo/inativo)
        $sqlStats = "SELECT 
                        SUM(duration_seconds) as total_duration_seconds,
                        COUNT(*) as total_activities
                     FROM activity_events 
                     $whereClause";
        $stmtStats = $db->prepare($sqlStats);
        $stmtStats->execute($bindings);
        $stats = $stmtStats->fetch();
        
        // Contar total
        $sqlCount = "SELECT COUNT(*) as total FROM activity_events $whereClause";
        $stmtCount = $db->prepare($sqlCount);
        $stmtCount->execute($bindings);
        $total = $stmtCount->fetch()['total'];
        
        // Buscar dados
        $sql = "SELECT id, hostname, username, executable, pid, window_title, start_time, end_time, duration_seconds as duration_second 
                FROM activity_events 
                $whereClause 
                ORDER BY start_time DESC 
                LIMIT :limit OFFSET :offset";
        
        $stmt = $db->prepare($sql);
        foreach ($bindings as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $activities = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'data' => $activities,
            'statistics' => [
                'total_active_seconds' => (int)($stats['total_duration_seconds'] ?? 0),
                'total_activities' => (int)($stats['total_activities'] ?? 0)
            ],
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => (int)$total,
                'total_pages' => ceil($total / $limit)
            ]
        ]);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar atividades',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Obter atividade específica por ID
function getWindowActivityById($db, $id) {
    try {
        $sql = "SELECT id, hostname, username, executable, pid, window_title, start_time, end_time, duration_seconds as duration_second FROM activity_events WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        $activity = $stmt->fetch();
        
        if (!$activity) {
            jsonResponse([
                'success' => false,
                'message' => 'Atividade não encontrada'
            ], 404);
        }
        
        jsonResponse([
            'success' => true,
            'data' => $activity
        ]);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar atividade',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Atualizar atividade (principalmente para finalizar)
function updateWindowActivity($db, $id, $data) {
    try {
        // Verificar se atividade existe
        $sqlCheck = "SELECT * FROM activity_events WHERE id = :id";
        $stmtCheck = $db->prepare($sqlCheck);
        $stmtCheck->execute([':id' => $id]);
        
        if (!$stmtCheck->fetch()) {
            jsonResponse([
                'success' => false,
                'message' => 'Atividade não encontrada'
            ], 404);
        }
        
        $updates = [];
        $bindings = [':id' => $id];
        
        if (isset($data['start_time'])) {
            $updates[] = "start_time = :start_time";
            $bindings[':start_time'] = $data['start_time'];
        }
        
        if (isset($data['end_time'])) {
            $updates[] = "end_time = :end_time";
            $bindings[':end_time'] = $data['end_time'];
        }
        
        if (isset($data['duration_second']) || isset($data['duration_seconds'])) {
            $updates[] = "duration_seconds = :duration_seconds";
            $bindings[':duration_seconds'] = $data['duration_seconds'] ?? $data['duration_second'];
        }
        
        if (empty($updates)) {
            jsonResponse([
                'success' => false,
                'message' => 'Nenhum campo para atualizar'
            ], 400);
        }
        
        $sql = "UPDATE activity_events SET " . implode(', ', $updates) . " WHERE id = :id";
        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        
        jsonResponse([
            'success' => true,
            'message' => 'Atividade atualizada com sucesso'
        ]);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao atualizar atividade',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Função auxiliar para atualizar última atividade do computador (não faz nada já que não temos tabela)
function updateComputerActivity($db, $hostname, $username) {
    // Como não temos tabela de computadores, não fazemos nada
    // As informações virão da própria tabela activity_events
    return true;
}

// Obter estatísticas de períodos ativos/inativos com os mesmos filtros
function getActivityPeriodStatistics($db, $params) {
    try {
        $where = [];
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
            $where[] = "DATE(start_time) = :date";
            $bindings[':date'] = $params['date'];
        }
        
        // Filtro de período de datas
        if (isset($params['startDate'])) {
            $where[] = "DATE(start_time) >= :start_date";
            $bindings[':start_date'] = $params['startDate'];
        }
        
        if (isset($params['endDate'])) {
            $where[] = "DATE(start_time) <= :end_date";
            $bindings[':end_date'] = $params['endDate'];
        }
        
        // Filtro de horário comercial (8:00 - 18:00)
        if (isset($params['businessHours']) && $params['businessHours'] === 'true') {
            $where[] = "(TIME(start_time) >= '08:00:00' AND TIME(start_time) < '18:00:00')";
        }
        
        // Filtro de horário personalizado
        if (isset($params['startTime']) && !empty($params['startTime'])) {
            $where[] = "TIME(start_time) >= :start_time";
            $bindings[':start_time'] = $params['startTime'];
        }
        
        if (isset($params['endTime']) && !empty($params['endTime'])) {
            $where[] = "TIME(start_time) < :end_time";
            $bindings[':end_time'] = $params['endTime'];
        }
        
        // Filtro para ignorar horário específico (ex: almoço)
        if (isset($params['ignoreTimeFrom']) && isset($params['ignoreTimeTo']) && 
            !empty($params['ignoreTimeFrom']) && !empty($params['ignoreTimeTo'])) {
            $where[] = "NOT (TIME(start_time) >= :ignore_from AND TIME(start_time) < :ignore_to)";
            $bindings[':ignore_from'] = $params['ignoreTimeFrom'];
            $bindings[':ignore_to'] = $params['ignoreTimeTo'];
        }
        
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        
        // Buscar estatísticas de períodos de atividade
        $sql = "SELECT 
                    period_type,
                    SUM(duration_seconds) as total_seconds,
                    COUNT(*) as total_periods
                FROM activity_periods 
                $whereClause
                GROUP BY period_type";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        $periods = $stmt->fetchAll();
        
        $activeSeconds = 0;
        $inactiveSeconds = 0;
        $activePeriods = 0;
        $inactivePeriods = 0;
        
        foreach ($periods as $period) {
            if ($period['period_type'] === 'active') {
                $activeSeconds = (int)$period['total_seconds'];
                $activePeriods = (int)$period['total_periods'];
            } else {
                $inactiveSeconds = (int)$period['total_seconds'];
                $inactivePeriods = (int)$period['total_periods'];
            }
        }
        
        $totalSeconds = $activeSeconds + $inactiveSeconds;
        $activePercentage = $totalSeconds > 0 ? ($activeSeconds / $totalSeconds * 100) : 0;
        
        jsonResponse([
            'success' => true,
            'data' => [
                'active_seconds' => $activeSeconds,
                'inactive_seconds' => $inactiveSeconds,
                'total_seconds' => $totalSeconds,
                'active_percentage' => round($activePercentage, 2),
                'active_periods' => $activePeriods,
                'inactive_periods' => $inactivePeriods
            ]
        ]);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar estatísticas de períodos',
            'error' => $e->getMessage()
        ], 500);
    }
}
