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
        # Tenta carregar do mesmo diretório do executável
        exe_dir = os.path.dirname(os.path.abspath(__file__))
        config_path = os.path.join(exe_dir, 'config.json')
        
        # Se não existir, tenta no ProgramData
        if not os.path.exists(config_path):
            config_path = os.path.join(
                os.environ.get('PROGRAMDATA', 'C:\\ProgramData'),
                'WinSysMonitor',
                'config.json'
            )
        
        # Tenta carregar o arquivo
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                    return config.get('api_url', 'http://pcmon.uniware.net.br:8090')
            except Exception:
                pass
        
        # Fallback: variável de ambiente ou padrão
        return os.environ.get('API_URL', 'http://pcmon.uniware.net.br:8090')
