<?php

// Obter estatísticas diárias calculadas em tempo real
function getDailyStats($db, $params) {
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
            $where[] = "DATE(start_time) = :date";
            $bindings[':date'] = $params['date'];
        } else {
            // Por padrão, últimos 7 dias
            $where[] = "start_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
        }
        
        $whereClause = 'WHERE ' . implode(' AND ', $where);
        
        // Calcular estatísticas diretamente da tabela de atividades
        $sql = "SELECT 
                    DATE(start_time) as date,
                    hostname,
                    username,
                    SUM(duration_seconds) as total_active_time_seconds,
                    COUNT(DISTINCT executable) as total_applications,
                    (SELECT executable FROM activity_events ae2 
                     WHERE ae2.hostname = ae.hostname 
                     AND ae2.username = ae.username 
                     AND DATE(ae2.start_time) = DATE(ae.start_time)
                     GROUP BY executable 
                     ORDER BY COUNT(*) DESC 
                     LIMIT 1) as most_used_app
                FROM activity_events ae
                $whereClause
                GROUP BY DATE(start_time), hostname, username
                ORDER BY date DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        
        $stats = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'data' => $stats,
            'total' => count($stats)
        ]);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar estatísticas',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Gerar estatísticas em tempo real (não salva no banco)
function getRealTimeStats($db, $params) {
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
        } else {
            $where[] = "DATE(start_time) = CURDATE()";
        }
        
        $whereClause = 'WHERE ' . implode(' AND ', $where);
        
        // Total de tempo ativo
        $sql = "SELECT 
                    SUM(duration_second) as total_time,
                    COUNT(*) as total_activities,
                    COUNT(DISTINCT executable) as unique_apps,
                    executable as most_used_app,
                    COUNT(*) as app_count
                FROM window_activities 
                $whereClause
                GROUP BY executable
                ORDER BY app_count DESC
                LIMIT 1";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        $result = $stmt->fetch();
        
        jsonResponse([
            'success' => true,
            'data' => $result ?: [
                'total_time' => 0,
                'total_activities' => 0,
                'unique_apps' => 0,
                'most_used_app' => null
            ]
        ]);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao calcular estatísticas',
            'error' => $e->getMessage()
        ], 500);
    }
}
