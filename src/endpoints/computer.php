<?php

// Registrar ou atualizar computador (apenas log, não salva em tabela separada)
function registerComputer($db, $data) {
    $required = ['hostname'];
    $missing = validateRequired($data, $required);
    
    if (!empty($missing)) {
        jsonResponse([
            'success' => false,
            'message' => 'Campos obrigatórios ausentes',
            'missing_fields' => $missing
        ], 400);
    }
    
    // Como não temos tabela de computadores, apenas retornamos sucesso
    jsonResponse([
        'success' => true,
        'message' => 'Computador registrado (via activity_events)',
        'data' => [
            'hostname' => $data['hostname']
        ]
    ], 201);
}

// Listar computadores baseado nas atividades
function getComputers($db, $params) {
    try {
        $where = [];
        $bindings = [];
        
        if (isset($params['hostname'])) {
            $where[] = "ae.hostname LIKE :hostname";
            $bindings[':hostname'] = '%' . $params['hostname'] . '%';
        }
        
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        
        // Buscar computadores únicos da tabela de atividades
        $sql = "SELECT 
                    ae.hostname,
                    ae.username,
                    MAX(ae.start_time) as last_activity,
                    COALESCE(TIMESTAMPDIFF(SECOND, ma.last_activity, NOW()), 999999) as seconds_since_last,
                    CASE 
                        WHEN ma.last_activity IS NOT NULL AND TIMESTAMPDIFF(SECOND, ma.last_activity, NOW()) < 60 THEN 'active'
                        WHEN ma.last_activity IS NOT NULL AND TIMESTAMPDIFF(SECOND, ma.last_activity, NOW()) < 3600 THEN 'inactive'
                        ELSE 'offline'
                    END as status,
                    COUNT(*) as total_activities
                FROM activity_events ae
                LEFT JOIN last_mouse_activity ma ON ae.hostname = ma.hostname AND ae.username = ma.username
                $whereClause
                GROUP BY ae.hostname, ae.username
                ORDER BY last_activity DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        
        $computers = $stmt->fetchAll();
        
        // Adicionar ID fictício para cada computador
        foreach ($computers as $key => $computer) {
            $computers[$key]['id'] = $key + 1;
            $computers[$key]['os_type'] = null;
            $computers[$key]['os_version'] = null;
        }
        
        jsonResponse([
            'success' => true,
            'data' => $computers,
            'total' => count($computers)
        ]);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar computadores',
            'error' => $e->getMessage()
        ], 500);
    }
}
// Obter atividade atual/em tempo real de um computador
function getCurrentActivity($db, $hostname, $username) {
    try {
        // Buscar a atividade mais recente (últimos 5 minutos)
        $sql = "SELECT 
                    id,
                    hostname,
                    username,
                    executable,
                    pid,
                    window_title,
                    start_time,
                    end_time,
                    duration_seconds,
                    TIMESTAMPDIFF(SECOND, start_time, COALESCE(end_time, NOW())) as current_duration,
                    CASE 
                        WHEN start_time > DATE_SUB(NOW(), INTERVAL 2 MINUTE) THEN 'active'
                        WHEN start_time > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'recent'
                        ELSE 'old'
                    END as activity_status
                FROM activity_events 
                WHERE hostname = :hostname 
                AND username = :username
                AND start_time > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
                ORDER BY start_time DESC 
                LIMIT 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':hostname' => $hostname,
            ':username' => $username
        ]);
        
        $activity = $stmt->fetch();
        
        if (!$activity) {
            jsonResponse([
                'success' => false,
                'message' => 'Nenhuma atividade recente encontrada'
            ], 404);
        }
        
        jsonResponse([
            'success' => true,
            'data' => $activity
        ]);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar atividade atual',
            'error' => $e->getMessage()
        ], 500);
    }
}
// Obter histórico de atividades recentes de um computador
function getRecentActivities($db, $hostname, $username, $params) {
    try {
        $minutes = isset($params['minutes']) ? (int)$params['minutes'] : 30;
        
        $sql = "SELECT 
                    id,
                    hostname,
                    username,
                    executable,
                    pid,
                    window_title,
                    start_time,
                    end_time,
                    duration_seconds,
                    TIMESTAMPDIFF(SECOND, start_time, COALESCE(end_time, NOW())) as current_duration
                FROM activity_events 
                WHERE hostname = :hostname 
                AND username = :username
                AND start_time > DATE_SUB(NOW(), INTERVAL :minutes MINUTE)
                ORDER BY start_time DESC 
                LIMIT 50";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':hostname' => $hostname,
            ':username' => $username,
            ':minutes' => $minutes
        ]);
        
        $activities = $stmt->fetchAll();
        
        // Calcular estatísticas
        $totalTime = 0;
        $apps = [];
        foreach ($activities as $activity) {
            $duration = $activity['duration_seconds'] ?? $activity['current_duration'];
            $totalTime += $duration;
            
            $exe = $activity['executable'];
            if (!isset($apps[$exe])) {
                $apps[$exe] = ['count' => 0, 'time' => 0];
            }
            $apps[$exe]['count']++;
            $apps[$exe]['time'] += $duration;
        }
        
        // Top 5 apps
        arsort($apps);
        $topApps = array_slice($apps, 0, 5, true);
        $topAppsList = [];
        foreach ($topApps as $exe => $data) {
            $topAppsList[] = [
                'executable' => $exe,
                'count' => $data['count'],
                'total_time' => $data['time']
            ];
        }
        
        jsonResponse([
            'success' => true,
            'data' => [
                'activities' => $activities,
                'stats' => [
                    'total_activities' => count($activities),
                    'total_time_seconds' => $totalTime,
                    'top_apps' => $topAppsList,
                    'period_minutes' => $minutes
                ]
            ]
        ]);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar atividades recentes',
            'error' => $e->getMessage()
        ], 500);
    }
}
