<?php
// Habilitar CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Se for requisição OPTIONS, retornar 200
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Incluir arquivo de configuração
require_once __DIR__ . '/../config/database.php';

// Pegar método HTTP e caminho
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = trim($path, '/');

// Pegar corpo da requisição
$input = json_decode(file_get_contents('php://input'), true);

// Router básico
try {
    $db = getDBConnection();
    
    // Rotas da API
    if ($path === '' || $path === 'api') {
        jsonResponse([
            'success' => true,
            'message' => 'API',
            'version' => API_VERSION,
            'endpoints' => [
                'POST /api/window-activity' => 'Registrar atividade de janela',
                'GET /api/window-activities' => 'Listar atividades',
                'GET /api/window-activities/{id}' => 'Obter atividade específica',
                'PUT /api/window-activity/{id}' => 'Atualizar atividade',
                'POST /api/computer/register' => 'Registrar computador',
                'GET /api/computers' => 'Listar computadores',
                'GET /api/stats/daily' => 'Estatísticas diárias',
                'GET /api/health' => 'Status da API'
            ]
        ]);
    }
    
    elseif ($path === 'api/health') {
        jsonResponse([
            'success' => true,
            'status' => 'healthy',
            'timestamp' => date('Y-m-d H:i:s'),
            'database' => 'connected'
        ]);
    }
    
    // Registrar atividade de janela
    elseif ($path === 'api/window-activity' && $method === 'POST') {
        require_once __DIR__ . '/endpoints/window-activity.php';
        createWindowActivity($db, $input);
    }
    
    // Salvar snapshot de janelas abertas
    elseif ($path === 'api/windows-snapshot' && $method === 'POST') {
        require_once __DIR__ . '/endpoints/windows-snapshot.php';
        saveWindowsSnapshot($db, $input);
    }
    
    // Salvar atividade do mouse/teclado
    elseif ($path === 'api/mouse-activity' && $method === 'POST') {
        require_once __DIR__ . '/endpoints/mouse-activity.php';
        saveMouseActivity($db, $input);
    }
    
    // Salvar período de atividade/inatividade
    elseif ($path === 'api/activity-periods' && $method === 'POST') {
        require_once __DIR__ . '/endpoints/activity-periods.php';
        saveActivityPeriod($db, $input);
    }
    
    // Obter períodos de atividade/inatividade
    elseif ($path === 'api/activity-periods' && $method === 'GET') {
        require_once __DIR__ . '/endpoints/activity-periods.php';
        getActivityPeriods($db, $_GET);
    }
    
    // Obter estatísticas de atividade
    elseif ($path === 'api/activity-statistics' && $method === 'GET') {
        require_once __DIR__ . '/endpoints/activity-periods.php';
        getActivityStatistics($db, $_GET);
    }
    
    // Obter estatísticas de períodos com filtros
    elseif ($path === 'api/activity-period-statistics' && $method === 'GET') {
        require_once __DIR__ . '/endpoints/window-activity.php';
        getActivityPeriodStatistics($db, $_GET);
    }
    
    // Listar atividades
    elseif ($path === 'api/window-activities' && $method === 'GET') {
        require_once __DIR__ . '/endpoints/window-activity.php';
        getWindowActivities($db, $_GET);
    }
    
    // Obter atividade específica
    elseif (preg_match('#^api/window-activities/(\d+)$#', $path, $matches) && $method === 'GET') {
        require_once __DIR__ . '/endpoints/window-activity.php';
        getWindowActivityById($db, $matches[1]);
    }
    
    // Atualizar atividade (finalizar)
    elseif (preg_match('#^api/window-activity/(\d+)$#', $path, $matches) && $method === 'PUT') {
        require_once __DIR__ . '/endpoints/window-activity.php';
        updateWindowActivity($db, $matches[1], $input);
    }
    
    // Registrar computador
    elseif ($path === 'api/computer/register' && $method === 'POST') {
        require_once __DIR__ . '/endpoints/computer.php';
        registerComputer($db, $input);
    }
    
    // Listar computadores
    elseif ($path === 'api/computers' && $method === 'GET') {
        require_once __DIR__ . '/endpoints/computer.php';
        getComputers($db, $_GET);
    }
    
    // Obter atividade atual de um computador específico
    elseif (preg_match('#^api/computers/([^/]+)/([^/]+)/current-activity$#', $path, $matches) && $method === 'GET') {
        require_once __DIR__ . '/endpoints/computer.php';
        getCurrentActivity($db, urldecode($matches[1]), urldecode($matches[2]));
    }
    
    // Obter histórico de atividades recentes de um computador
    elseif (preg_match('#^api/computers/([^/]+)/([^/]+)/recent-activities$#', $path, $matches) && $method === 'GET') {
        require_once __DIR__ . '/endpoints/computer.php';
        getRecentActivities($db, urldecode($matches[1]), urldecode($matches[2]), $_GET);
    }
    
    // Deletar registros de atividade de um computador (admin)
    elseif (preg_match('#^(api/)?computers/([^/]+)/([^/]+)/delete-records$#', $path, $matches) && $method === 'DELETE') {
        require_once __DIR__ . '/endpoints/computer.php';
        deleteComputerRecords($db, urldecode($matches[2]), urldecode($matches[3]));
    }
    
    // Obter snapshot de janelas abertas de um computador
    elseif (preg_match('#^api/computers/([^/]+)/([^/]+)/windows-snapshot$#', $path, $matches) && $method === 'GET') {
        require_once __DIR__ . '/endpoints/windows-snapshot.php';
        getWindowsSnapshot($db, urldecode($matches[1]), urldecode($matches[2]));
    }
    
    // Obter status de atividade de todos os computadores
    elseif ($path === 'api/computers/activity-status' && $method === 'GET') {
        require_once __DIR__ . '/endpoints/mouse-activity.php';
        getComputersActivityStatus($db);
    }
    
    // Obter status de atividade de um computador específico
    elseif (preg_match('#^api/computers/([^/]+)/([^/]+)/activity-status$#', $path, $matches) && $method === 'GET') {
        require_once __DIR__ . '/endpoints/mouse-activity.php';
        getComputerActivityStatus($db, urldecode($matches[1]), urldecode($matches[2]));
    }
    
    // Estatísticas diárias
    elseif ($path === 'api/stats/daily' && $method === 'GET') {
        require_once __DIR__ . '/endpoints/stats.php';
        getDailyStats($db, $_GET);
    }
    
    // Listar usuários
    elseif ($path === 'api/users' && $method === 'GET') {
        require_once __DIR__ . '/endpoints/user-analytics.php';
        getUsers($db, $_GET);
    }
    
    // Estatísticas de um usuário específico
    elseif (preg_match('#^api/users/([^/]+)/stats$#', $path, $matches) && $method === 'GET') {
        require_once __DIR__ . '/endpoints/user-analytics.php';
        getUserStats($db, urldecode($matches[1]));
    }
    
    // Listar todos os aplicativos do usuário
    elseif (preg_match('#^api/users/([^/]+)/applications$#', $path, $matches) && $method === 'GET') {
        require_once __DIR__ . '/endpoints/user-analytics.php';
        getUserApplications($db, urldecode($matches[1]));
    }
    
    // Listar atividades de um aplicativo específico do usuário
    elseif (preg_match('#^api/users/([^/]+)/applications/([^/]+)/activities$#', $path, $matches) && $method === 'GET') {
        require_once __DIR__ . '/endpoints/user-analytics.php';
        getUserApplicationActivities($db, urldecode($matches[1]), urldecode($matches[2]));
    }
    
    // Comparar usuários
    elseif ($path === 'api/users/compare' && $method === 'GET') {
        require_once __DIR__ . '/endpoints/user-analytics.php';
        compareUsers($db, $_GET);
    }
    
    // Top aplicativos por tempo de uso
    elseif ($path === 'api/top-applications' && $method === 'GET') {
        require_once __DIR__ . '/endpoints/top-applications.php';
        getTopApplications($db, $_GET);
    }
    
    // Limpar todos os dados
    elseif ($path === 'api/cleanup/all' && $method === 'DELETE') {
        require_once __DIR__ . '/endpoints/cleanup.php';
        $result = cleanupAll($db);
        jsonResponse($result);
    }
    
    // Limpar dados antigos (30 dias)
    elseif ($path === 'api/cleanup/old' && $method === 'DELETE') {
        require_once __DIR__ . '/endpoints/cleanup.php';
        $result = cleanupOldData($db);
        jsonResponse($result);
    }
    
    // Rota não encontrada
    else {
        jsonResponse([
            'success' => false,
            'message' => 'Endpoint não encontrado'
        ], 404);
    }
    
} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'message' => 'Erro interno do servidor',
        'error' => $e->getMessage()
    ], 500);
}
