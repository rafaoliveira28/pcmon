<?php

// Listar todos os executáveis ignorados
function getIgnoredExecutables($db) {
    try {
        $sql = "SELECT id, executable, description, created_at 
                FROM ignored_executables 
                ORDER BY executable ASC";
        
        $stmt = $db->query($sql);
        $executables = $stmt->fetchAll();
        
        jsonResponse([
            'success' => true,
            'data' => $executables,
            'total' => count($executables)
        ]);
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao buscar executáveis ignorados',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Adicionar executável à lista de ignorados
function addIgnoredExecutable($db, $data) {
    $required = ['executable'];
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
        $sql = "INSERT INTO ignored_executables (executable, description) 
                VALUES (:executable, :description)";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([
            ':executable' => $data['executable'],
            ':description' => $data['description'] ?? null
        ]);
        
        jsonResponse([
            'success' => true,
            'message' => 'Executável adicionado à lista de ignorados',
            'data' => [
                'id' => $db->lastInsertId(),
                'executable' => $data['executable']
            ]
        ], 201);
        
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) {
            jsonResponse([
                'success' => false,
                'message' => 'Este executável já está na lista de ignorados'
            ], 409);
        } else {
            jsonResponse([
                'success' => false,
                'message' => 'Erro ao adicionar executável',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

// Remover executável da lista de ignorados
function removeIgnoredExecutable($db, $id) {
    try {
        $sql = "DELETE FROM ignored_executables WHERE id = :id";
        
        $stmt = $db->prepare($sql);
        $stmt->execute([':id' => $id]);
        
        if ($stmt->rowCount() > 0) {
            jsonResponse([
                'success' => true,
                'message' => 'Executável removido da lista de ignorados'
            ]);
        } else {
            jsonResponse([
                'success' => false,
                'message' => 'Executável não encontrado'
            ], 404);
        }
        
    } catch (PDOException $e) {
        jsonResponse([
            'success' => false,
            'message' => 'Erro ao remover executável',
            'error' => $e->getMessage()
        ], 500);
    }
}

// Verificar se um executável está na lista de ignorados
function isExecutableIgnored($db, $executable) {
    try {
        $sql = "SELECT COUNT(*) as count FROM ignored_executables WHERE executable = :executable";
        $stmt = $db->prepare($sql);
        $stmt->execute([':executable' => $executable]);
        $result = $stmt->fetch();
        
        return $result['count'] > 0;
    } catch (PDOException $e) {
        error_log("Erro ao verificar executável ignorado: " . $e->getMessage());
        return false;
    }
}
