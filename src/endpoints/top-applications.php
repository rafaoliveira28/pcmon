<?php

function getTopApplications($db, $params) {
    try {
        $bindings = [];
        $where = [];
        
        // Filtros de data
        if (isset($params['startDate']) && !empty($params['startDate'])) {
            $where[] = "DATE(start_time) >= :start_date";
            $bindings[':start_date'] = $params['startDate'];
        }
        
        if (isset($params['endDate']) && !empty($params['endDate'])) {
            $where[] = "DATE(start_time) <= :end_date";
            $bindings[':end_date'] = $params['endDate'];
        }
        
        // Filtro de usuário
        if (isset($params['username']) && !empty($params['username'])) {
            $where[] = "username = :username";
            $bindings[':username'] = $params['username'];
        }
        
        // Filtro de hostname
        if (isset($params['hostname']) && !empty($params['hostname'])) {
            $where[] = "hostname = :hostname";
            $bindings[':hostname'] = $params['hostname'];
        }
        
        // Filtro de horário de início
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
        
        // Filtro de dias úteis (Segunda a Sexta)
        if (isset($params['businessHours']) && $params['businessHours'] === 'true') {
            $where[] = "WEEKDAY(start_time) < 5";
        }
        
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        
        // Limite de resultados (padrão Top 5)
        $limit = isset($params['limit']) ? (int)$params['limit'] : 5;
        
        // Buscar top aplicativos por tempo de uso
        $sql = "SELECT 
                    executable,
                    SUM(duration_seconds) as total_seconds,
                    COUNT(*) as activity_count
                FROM activity_events 
                $whereClause 
                GROUP BY executable 
                ORDER BY total_seconds DESC 
                LIMIT :limit";
        
        $stmt = $db->prepare($sql);
        foreach ($bindings as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        $applications = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'data' => $applications
        ]);
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar aplicativos',
            'error' => $e->getMessage()
        ], 500);
    }
}
