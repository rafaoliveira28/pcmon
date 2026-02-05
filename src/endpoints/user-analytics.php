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

// Calcular duração válida de uma atividade considerando filtros de horário
function calculateValidDuration($startTime, $endTime, $durationSeconds, $filters) {
    $activityStart = strtotime($startTime);
    $activityEnd = strtotime($endTime);
    $activityDate = date('Y-m-d', $activityStart);
    
    // Aplicar filtros de horário inicial/final
    if ($filters['startTime'] || $filters['endTime']) {
        $dayStart = strtotime($activityDate . ' ' . ($filters['startTime'] ?? '00:00:00'));
        $dayEnd = strtotime($activityDate . ' ' . ($filters['endTime'] ?? '23:59:59'));
        
        // Atividade fora do range completamente
        if ($activityEnd <= $dayStart || $activityStart >= $dayEnd) {
            return 0;
        }
        
        // Ajustar para caber no range
        $activityStart = max($activityStart, $dayStart);
        $activityEnd = min($activityEnd, $dayEnd);
    }
    
    // Calcular duração dentro do range
    $validSeconds = $activityEnd - $activityStart;
    
    // Subtrair horário ignorado (ex: almoço)
    if ($filters['ignoreFrom'] && $filters['ignoreTo'] && $validSeconds > 0) {
        $ignoreStart = strtotime($activityDate . ' ' . $filters['ignoreFrom']);
        $ignoreEnd = strtotime($activityDate . ' ' . $filters['ignoreTo']);
        
        // Verificar overlap
        $overlapStart = max($activityStart, $ignoreStart);
        $overlapEnd = min($activityEnd, $ignoreEnd);
        
        if ($overlapStart < $overlapEnd) {
            $validSeconds -= ($overlapEnd - $overlapStart);
        }
    }
    
    return max(0, $validSeconds);
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
        
        // Preparar filtros de horário
        $useBusinessHours = isset($_GET['businessHours']) && $_GET['businessHours'] === 'true';
        $filters = [
            'startTime' => $useBusinessHours ? '08:00:00' : ($_GET['startTime'] ?? null),
            'endTime' => $useBusinessHours ? '18:00:00' : ($_GET['endTime'] ?? null),
            'ignoreFrom' => $_GET['ignoreTimeFrom'] ?? null,
            'ignoreTo' => $_GET['ignoreTimeTo'] ?? null
        ];
        
        // Buscar todas as atividades
        $sql = "SELECT 
                    id, executable, start_time, end_time, duration_seconds,
                    DATE(start_time) as activity_date,
                    HOUR(start_time) as activity_hour,
                    DAYOFWEEK(start_time) as day_number
                FROM activity_events
                WHERE username = :username $dateFilter
                ORDER BY start_time";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calcular estatísticas com durações ajustadas
        $totalSeconds = 0;
        $maxSeconds = 0;
        $uniqueApps = [];
        $uniqueDays = [];
        $appStats = [];
        $weekdayStats = [];
        $hourStats = [];
        $dateStats = [];
        $validActivities = [];
        
        foreach ($activities as $activity) {
            $validDuration = calculateValidDuration(
                $activity['start_time'],
                $activity['end_time'],
                $activity['duration_seconds'],
                $filters
            );
            
            if ($validDuration <= 0) continue;
            
            $validActivities[] = $activity;
            $totalSeconds += $validDuration;
            $maxSeconds = max($maxSeconds, $validDuration);
            $uniqueApps[$activity['executable']] = true;
            $uniqueDays[$activity['activity_date']] = true;
            
            // Por aplicativo
            if (!isset($appStats[$activity['executable']])) {
                $appStats[$activity['executable']] = [
                    'executable' => $activity['executable'],
                    'total_seconds' => 0,
                    'access_count' => 0,
                    'max_seconds' => 0
                ];
            }
            $appStats[$activity['executable']]['total_seconds'] += $validDuration;
            $appStats[$activity['executable']]['access_count']++;
            $appStats[$activity['executable']]['max_seconds'] = max(
                $appStats[$activity['executable']]['max_seconds'],
                $validDuration
            );
            
            // Por dia da semana
            $dayNum = $activity['day_number'];
            if (!isset($weekdayStats[$dayNum])) {
                $weekdays = ['', 'Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                $weekdayStats[$dayNum] = [
                    'day_number' => $dayNum,
                    'weekday' => $weekdays[$dayNum],
                    'total_seconds' => 0,
                    'activities' => 0
                ];
            }
            $weekdayStats[$dayNum]['total_seconds'] += $validDuration;
            $weekdayStats[$dayNum]['activities']++;
            
            // Por hora
            $hour = $activity['activity_hour'];
            if (!isset($hourStats[$hour])) {
                $hourStats[$hour] = [
                    'hour' => $hour,
                    'total_seconds' => 0,
                    'activities' => 0
                ];
            }
            $hourStats[$hour]['total_seconds'] += $validDuration;
            $hourStats[$hour]['activities']++;
            
            // Por data
            $date = $activity['activity_date'];
            if (!isset($dateStats[$date])) {
                $dateStats[$date] = [
                    'date' => $date,
                    'total_seconds' => 0,
                    'activities' => 0,
                    'unique_apps' => []
                ];
            }
            $dateStats[$date]['total_seconds'] += $validDuration;
            $dateStats[$date]['activities']++;
            $dateStats[$date]['unique_apps'][$activity['executable']] = true;
        }
        
        // Formatar resultados
        $general = [
            'total_activities' => count($validActivities),
            'unique_apps' => count($uniqueApps),
            'active_days' => count($uniqueDays),
            'total_time_seconds' => $totalSeconds,
            'avg_session_seconds' => count($validActivities) > 0 ? $totalSeconds / count($validActivities) : 0,
            'max_session_seconds' => $maxSeconds
        ];
        
        // Top 10 apps
        usort($appStats, function($a, $b) {
            return $b['total_seconds'] - $a['total_seconds'];
        });
        $topApps = array_slice($appStats, 0, 10);
        foreach ($topApps as &$app) {
            $app['total_hours'] = round($app['total_seconds'] / 3600, 2);
            $app['avg_seconds'] = $app['access_count'] > 0 ? $app['total_seconds'] / $app['access_count'] : 0;
        }
        
        // Por dia da semana
        ksort($weekdayStats);
        $byWeekday = array_values($weekdayStats);
        foreach ($byWeekday as &$day) {
            $day['total_hours'] = round($day['total_seconds'] / 3600, 2);
        }
        
        // Por hora
        ksort($hourStats);
        $byHour = array_values($hourStats);
        foreach ($byHour as &$hour) {
            $hour['total_hours'] = round($hour['total_seconds'] / 3600, 2);
        }
        
        // Timeline
        krsort($dateStats);
        $timeline = [];
        foreach ($dateStats as $date => $stats) {
            $timeline[] = [
                'date' => $date,
                'activities' => $stats['activities'],
                'total_seconds' => $stats['total_seconds'],
                'total_hours' => round($stats['total_seconds'] / 3600, 2),
                'unique_apps' => count($stats['unique_apps'])
            ];
        }
        
        // Atividades recentes (últimas 20)
        $recentActivities = array_slice($validActivities, -20);
        $recentActivities = array_reverse($recentActivities);
        
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
        
        // Preparar filtros de horário
        $useBusinessHours = isset($_GET['businessHours']) && $_GET['businessHours'] === 'true';
        $filters = [
            'startTime' => $useBusinessHours ? '08:00:00' : ($_GET['startTime'] ?? null),
            'endTime' => $useBusinessHours ? '18:00:00' : ($_GET['endTime'] ?? null),
            'ignoreFrom' => $_GET['ignoreTimeFrom'] ?? null,
            'ignoreTo' => $_GET['ignoreTimeTo'] ?? null
        ];
        
        // Filtro por aplicativo específico
        $appFilter = '';
        if (isset($_GET['app'])) {
            $appFilter = " AND executable LIKE :app";
            $bindings[':app'] = '%' . $_GET['app'] . '%';
        }
        
        // Buscar todas as atividades
        $sql = "SELECT 
                    executable,
                    start_time,
                    end_time,
                    duration_seconds,
                    DATE(start_time) as activity_date
                FROM activity_events
                WHERE username = :username $dateFilter $appFilter
                ORDER BY start_time";
        
        $stmt = $db->prepare($sql);
        $stmt->execute($bindings);
        $activities = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calcular estatísticas por aplicativo
        $appStats = [];
        
        foreach ($activities as $activity) {
            $validDuration = calculateValidDuration(
                $activity['start_time'],
                $activity['end_time'],
                $activity['duration_seconds'],
                $filters
            );
            
            if ($validDuration <= 0) continue;
            
            $exe = $activity['executable'];
            if (!isset($appStats[$exe])) {
                $appStats[$exe] = [
                    'executable' => $exe,
                    'total_seconds' => 0,
                    'access_count' => 0,
                    'min_seconds' => PHP_INT_MAX,
                    'max_seconds' => 0,
                    'first_use' => $activity['start_time'],
                    'last_use' => $activity['end_time'],
                    'active_days' => []
                ];
            }
            
            $appStats[$exe]['total_seconds'] += $validDuration;
            $appStats[$exe]['access_count']++;
            $appStats[$exe]['min_seconds'] = min($appStats[$exe]['min_seconds'], $validDuration);
            $appStats[$exe]['max_seconds'] = max($appStats[$exe]['max_seconds'], $validDuration);
            $appStats[$exe]['last_use'] = $activity['end_time'];
            $appStats[$exe]['active_days'][$activity['activity_date']] = true;
        }
        
        // Formatar resultados
        $applications = [];
        foreach ($appStats as $stats) {
            $applications[] = [
                'executable' => $stats['executable'],
                'access_count' => $stats['access_count'],
                'total_seconds' => $stats['total_seconds'],
                'avg_seconds' => $stats['access_count'] > 0 ? $stats['total_seconds'] / $stats['access_count'] : 0,
                'min_seconds' => $stats['min_seconds'] === PHP_INT_MAX ? 0 : $stats['min_seconds'],
                'max_seconds' => $stats['max_seconds'],
                'total_hours' => round($stats['total_seconds'] / 3600, 2),
                'first_use' => $stats['first_use'],
                'last_use' => $stats['last_use'],
                'active_days' => count($stats['active_days'])
            ];
        }
        
        // Ordenar por total_seconds
        usort($applications, function($a, $b) {
            return $b['total_seconds'] - $a['total_seconds'];
        });
        
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
