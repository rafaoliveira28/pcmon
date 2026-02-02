"""
Configuração do monitor
"""
import json
import os

class Config:
    def __init__(self):
        # Tenta carregar do arquivo de configuração
        self.API_URL = self._load_api_url()
    
    def _load_api_url(self):
        """Carrega URL da API do arquivo de configuração"""
        # Lista de possíveis locais para o config.json (em ordem de prioridade)
        possible_paths = [
            # 1. Mesmo diretório do executável
            os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json'),
            # 2. Diretório do usuário no LOCALAPPDATA
            os.path.join(os.environ.get('LOCALAPPDATA', ''), 'svch', 'config.json'),
            # 3. Diretório do usuário no APPDATA
            os.path.join(os.environ.get('APPDATA', ''), 'svch', 'config.json'),
            # 4. Pasta do usuário
            os.path.join(os.path.expanduser('~'), '.svch', 'config.json'),
        ]
        
        # Tenta carregar de cada local
        for config_path in possible_paths:
            if config_path and os.path.exists(config_path):
                try:
                    with open(config_path, 'r') as f:
                        config = json.load(f)
                        return config.get('api_url', 'http://pcmon.uniware.net.br:8090')
                except Exception:
                    continue
        
        # Fallback: variável de ambiente ou padrão
        return os.environ.get('API_URL', 'http://pcmon.uniware.net.br:8090')
