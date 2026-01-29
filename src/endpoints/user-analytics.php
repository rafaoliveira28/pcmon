<?php

// Listar todos os usuários únicos
function getUsers($db, $params) {
    try {
        $sql = "SELECT 
                    username,
                    hostname,
                    COUNT(*) as total_activities,
                    SUM(duration_seconds) as total_time_seconds,
                    MAX(start_time) as last_activity,
                    MIN(start_time) as first_activity
                FROM activity_events
                GROUP BY username, hostname
                ORDER BY total_time_seconds DESC";
        
        $stmt = $db->query($sql);
        $users = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'data' => $users,
            'total' => count($users)
        ]);
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar usuários',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Obter estatísticas detalhadas de um usuário específico
function getUserStats($db, $username) {
    try {
        $bindings = [':username' => $username];
        
        // Filtro de data opcional
        $dateFilter = '';
        if (isset($_GET['date'])) {
            $dateFilter = " AND DATE(start_time) = :date";
            $bindings[':date'] = $_GET['date'];
        } elseif (isset($_GET['start_date']) && isset($_GET['end_date'])) {
            $dateFilter = " AND DATE(start_time) BETWEEN :start_date AND :end_date";
            $bindings[':start_date'] = $_GET['start_date'];
            $bindings[':end_date'] = $_GET['end_date'];
        } else {
            // Últimos 30 dias por padrão
            $dateFilter = " AND start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        }
        
        // Filtros de horário
        $timeFilters = '';
        
        // Horário comercial (8:00 - 18:00)
        if (isset($_GET['businessHours']) && $_GET['businessHours'] === 'true') {
            $timeFilters .= " AND (TIME(start_time) >= '08:00:00' AND TIME(start_time) < '18:00:00')";
        }
        
        // Horário personalizado
        if (isset($_GET['startTime']) && !empty($_GET['startTime'])) {
            $timeFilters .= " AND TIME(start_time) >= :start_time";
            $bindings[':start_time'] = $_GET['startTime'];
        }
        
        if (isset($_GET['endTime']) && !empty($_GET['endTime'])) {
            $timeFilters .= " AND TIME(start_time) < :end_time";
            $bindings[':end_time'] = $_GET['endTime'];
        }
        
        // Ignorar horário específico
        if (isset($_GET['ignoreTimeFrom']) && isset($_GET['ignoreTimeTo']) && 
            !empty($_GET['ignoreTimeFrom']) && !empty($_GET['ignoreTimeTo'])) {
            $timeFilters .= " AND NOT (TIME(start_time) >= :ignore_from AND TIME(start_time) < :ignore_to)";
            $bindings[':ignore_from'] = $_GET['ignoreTimeFrom'];
            $bindings[':ignore_to'] = $_GET['ignoreTimeTo'];
        }
        
        // Estatísticas gerais
        $sqlGeneral = "SELECT 
                        COUNT(*) as total_activities,
                        COUNT(DISTINCT executable) as unique_apps,
                        COUNT(DISTINCT DATE(start_time)) as active_days,
                        SUM(duration_seconds) as total_time_seconds,
                        AVG(duration_seconds) as avg_session_seconds,
                        MAX(duration_seconds) as max_session_seconds,
                        MIN(start_time) as first_activity,
                        MAX(end_time) as last_activity
                    FROM activity_events
                    WHERE username = :username $dateFilter $timeFilters";
        
        $stmt = $db->prepare($sqlGeneral);
        $stmt->execute($bindings);
        $general = $stmt->fetch();
        
        // Top 10 aplicativos por tempo
        $sqlTopApps = "SELECT 
                        executable,
                        COUNT(*) as access_count,
                        SUM(duration_seconds) as total_seconds,
                        AVG(duration_seconds) as avg_seconds,
                        MAX(duration_seconds) as max_seconds,
                        ROUND(SUM(duration_seconds) / 3600, 2) as total_hours
                    FROM activity_events
                    WHERE username = :username $dateFilter $timeFilters
                    GROUP BY executable
                    ORDER BY total_seconds DESC
                    LIMIT 10";
        
        $stmt = $db->prepare($sqlTopApps);
        $stmt->execute($bindings);
        $topApps = $stmt->fetchAll();
        
        // Atividades por dia da semana
        $sqlByWeekday = "SELECT 
                            DAYOFWEEK(start_time) as day_number,
                            CASE DAYOFWEEK(start_time)
                                WHEN 1 THEN 'Domingo'
                                WHEN 2 THEN 'Segunda'
                                WHEN 3 THEN 'Terça'
                                WHEN 4 THEN 'Quarta'
                                WHEN 5 THEN 'Quinta'
                                WHEN 6 THEN 'Sexta'
                                WHEN 7 THEN 'Sábado'
                            END as weekday,
                            COUNT(*) as activities,
                            SUM(duration_seconds) as total_seconds,
                            ROUND(SUM(duration_seconds) / 3600, 2) as total_hours
                        FROM activity_events
                        WHERE username = :username $dateFilter $timeFilters
                        GROUP BY DAYOFWEEK(start_time)
                        ORDER BY day_number";
        
        $stmt = $db->prepare($sqlByWeekday);
        $stmt->execute($bindings);
        $byWeekday = $stmt->fetchAll();
        
        // Atividades por hora do dia
        $sqlByHour = "SELECT 
                        HOUR(start_time) as hour,
                        COUNT(*) as activities,
                        SUM(duration_seconds) as total_seconds,
                        ROUND(SUM(duration_seconds) / 3600, 2) as total_hours
                    FROM activity_events
                    WHERE username = :username $dateFilter $timeFilters
                    GROUP BY HOUR(start_time)
                    ORDER BY hour";
        
        $stmt = $db->prepare($sqlByHour);
        $stmt->execute($bindings);
        $byHour = $stmt->fetchAll();
        
        // Timeline diario (ultimos 7 dias ou range selecionado)
        $sqlTimeline = "SELECT 
                            DATE(start_time) as date,
                            COUNT(*) as activities,
                            SUM(duration_seconds) as total_seconds,
                            ROUND(SUM(duration_seconds) / 3600, 2) as total_hours,
                            COUNT(DISTINCT executable) as unique_apps
                        FROM activity_events
                        WHERE username = :username $dateFilter $timeFilters
                        GROUP BY DATE(start_time)
                        ORDER BY date DESC";
        
        $stmt = $db->prepare($sqlTimeline);
        $stmt->execute($bindings);
        $timeline = $stmt->fetchAll();
        
        // Atividades mais recentes
        $sqlRecent = "SELECT 
                        id, hostname, executable, window_title, 
                        start_time, end_time, duration_seconds as duration_second
                    FROM activity_events
                    WHERE username = :username $dateFilter $timeFilters
                    ORDER BY start_time DESC
                    LIMIT 20";
        
        $stmt = $db->prepare($sqlRecent);
        $stmt->execute($bindings);
        $recentActivities = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'username' => $username,
            'data' => [
                'general' => $general,
                'top_apps' => $topApps,
                'by_weekday' => $byWeekday,
                'by_hour' => $byHour,
                'timeline' => $timeline,
                'recent_activities' => $recentActivities
            ]
        ]);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar estatísticas do usuário',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Obter todos os aplicativos do usuário
function getUserApplications($db, $username) {
    try {
        $bindings = [':username' => $username];
        
        // Filtro de data
        $dateFilter = '';
        if (isset($_GET['date'])) {
            $dateFilter = " AND DATE(start_time) = :date";
            $bindings[':date'] = $_GET['date'];
        } elseif (isset($_GET['start_date']) && isset($_GET['end_date'])) {
            $dateFilter = " AND DATE(start_time) BETWEEN :start_date AND :end_date";
            $bindings[':start_date'] = $_GET['start_date'];
            $bindings[':end_date'] = $_GET['end_date'];
        } else {
            $dateFilter = " AND start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        }
        
        // Filtros de horário
        $timeFilters = '';
        
        // Horário comercial
        if (isset($_GET['businessHours']) && $_GET['businessHours'] === 'true') {
            $timeFilters .= " AND (TIME(start_time) >= '08:00:00' AND TIME(start_time) < '18:00:00')";
        }
        
        // Horário personalizado
        if (isset($_GET['startTime']) && !empty($_GET['startTime'])) {
            $timeFilters .= " AND TIME(start_time) >= :start_time";
            $bindings[':start_time'] = $_GET['startTime'];
        }
        
        if (isset($_GET['endTime']) && !empty($_GET['endTime'])) {
            $timeFilters .= " AND TIME(start_time) < :end_time";
            $bindings[':end_time'] = $_GET['endTime'];
        }
        
        // Ignorar horário específico
        if (isset($_GET['ignoreTimeFrom']) && isset($_GET['ignoreTimeTo']) && 
            !empty($_GET['ignoreTimeFrom']) && !empty($_GET['ignoreTimeTo'])) {
            $timeFilters .= " AND NOT (TIME(start_time) >= :ignore_from AND TIME(start_time) < :ignore_to)";
            $bindings[':ignore_from'] = $_GET['ignoreTimeFrom'];
            $bindings[':ignore_to'] = $_GET['ignoreTimeTo'];
        }
        
        // Filtro por aplicativo específico
        $appFilter = '';
        if (isset($_GET['app'])) {
            $appFilter = " AND executable LIKE :app";
            $bindings[':app'] = '%' . $_GET['app'] . '%';
        }
        
        // Buscar todos os aplicativos com estatísticas
        $sql = "SELECT 
                    executable,
                    COUNT(*) as access_count,
                    SUM(duration_seconds) as total_seconds,
                    AVG(duration_seconds) as avg_seconds,
                    MIN(duration_seconds) as min_seconds,
                    MAX(duration_seconds) as max_seconds,
                    ROUND(SUM(duration_seconds) / 3600, 2) as total_hours,
                    MIN(start_time) as first_use,
                    MAX(end_time) as last_use,
                    COUNT(DISTINCT DATE(start_time)) as active_days
                FROM activity_events
                WHERE username = :username $dateFilter $timeFilters $appFilter
                GROUP BY executable
                ORDER BY total_seconds DESC";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        $applications = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'username' => $username,
            'data' => $applications,
            'total' => count($applications)
        ]);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar aplicativos do usuário',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Obter atividades detalhadas por aplicativo
function getUserApplicationActivities($db, $username, $executable) {
    try {
        $bindings = [
            ':username' => $username,
            ':executable' => $executable
        ];
        
        // Filtro de data
        $dateFilter = '';
        if (isset($_GET['date'])) {
            $dateFilter = " AND DATE(start_time) = :date";
            $bindings[':date'] = $_GET['date'];
        } elseif (isset($_GET['start_date']) && isset($_GET['end_date'])) {
            $dateFilter = " AND DATE(start_time) BETWEEN :start_date AND :end_date";
            $bindings[':start_date'] = $_GET['start_date'];
            $bindings[':end_date'] = $_GET['end_date'];
        }
        
        // Filtros de horário
        $timeFilters = '';
        
        // Horário comercial
        if (isset($_GET['businessHours']) && $_GET['businessHours'] === 'true') {
            $timeFilters .= " AND (TIME(start_time) >= '08:00:00' AND TIME(start_time) < '18:00:00')";
        }
        
        // Horário personalizado
        if (isset($_GET['startTime']) && !empty($_GET['startTime'])) {
            $timeFilters .= " AND TIME(start_time) >= :start_time";
            $bindings[':start_time'] = $_GET['startTime'];
        }
        
        if (isset($_GET['endTime']) && !empty($_GET['endTime'])) {
            $timeFilters .= " AND TIME(start_time) < :end_time";
            $bindings[':end_time'] = $_GET['endTime'];
        }
        
        // Ignorar horário específico
        if (isset($_GET['ignoreTimeFrom']) && isset($_GET['ignoreTimeTo']) && 
            !empty($_GET['ignoreTimeFrom']) && !empty($_GET['ignoreTimeTo'])) {
            $timeFilters .= " AND NOT (TIME(start_time) >= :ignore_from AND TIME(start_time) < :ignore_to)";
            $bindings[':ignore_from'] = $_GET['ignoreTimeFrom'];
            $bindings[':ignore_to'] = $_GET['ignoreTimeTo'];
        }
        
        // Paginação
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
        $offset = ($page - 1) * $limit;
        
        // Contar total
        $sqlCount = "SELECT COUNT(*) as total 
                     FROM activity_events 
                     WHERE username = :username 
                     AND executable = :executable $dateFilter $timeFilters";
        $stmtCount = $db->prepare($sqlCount);
        $stmtCount->execute($bindings);
        $total = $stmtCount->fetch()['total'];
        
        // Buscar atividades
        $sql = "SELECT 
                    id, hostname, executable, window_title, pid,
                    start_time, end_time, duration_seconds as duration_second
                FROM activity_events 
                WHERE username = :username 
                AND executable = :executable $dateFilter $timeFilters
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
            'username' => $username,
            'executable' => $executable,
            'data' => $activities,
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
            'message' => 'Erro ao buscar atividades do aplicativo',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Comparar produtividade entre usuarios
function compareUsers($db, $params) {
    try {
        $dateFilter = '';
        $bindings = [];
        
        if (isset($params['date'])) {
            $dateFilter = " WHERE DATE(start_time) = :date";
            $bindings[':date'] = $params['date'];
        } else {
            $dateFilter = " WHERE start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        }
        
        $sql = "SELECT 
                    username,
                    hostname,
                    COUNT(*) as total_activities,
                    SUM(duration_seconds) as total_seconds,
                    ROUND(SUM(duration_seconds) / 3600, 2) as total_hours,
                    COUNT(DISTINCT executable) as unique_apps,
                    COUNT(DISTINCT DATE(start_time)) as active_days,
                    AVG(duration_seconds) as avg_session_seconds
                FROM activity_events
                $dateFilter
                GROUP BY username, hostname
                ORDER BY total_seconds DESC
                LIMIT 20";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        $comparison = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'data' => $comparison
        ]);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao comparar usuarios',
            'error' => $e->getMessage()
        ], 500);
    }
}
