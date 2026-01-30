"""
WinSysMonitor - Executável principal
Roda em segundo plano monitorando atividades
"""
import sys
import os
import argparse
import logging

# Ocultar console (sem janela)
if sys.platform == 'win32':
    import ctypes
    ctypes.windll.user32.ShowWindow(ctypes.windll.kernel32.GetConsoleWindow(), 0)

from monitor import ActivityMonitor

def setup_logging(debug_mode=False):
    """Configura o sistema de logging"""
    # Usa AppData Local do usuário (sempre tem permissão)
    log_dir = os.path.join(os.environ.get('LOCALAPPDATA', os.path.expanduser('~')), 'svch')
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, 'monitor.log')
    
    # Define nível baseado no modo debug
    level = logging.DEBUG if debug_mode else logging.ERROR
    
    logging.basicConfig(
        filename=log_file,
        level=level,
        format='%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    if debug_mode:
        logging.info("=" * 50)
        logging.info("WinSysMonitor iniciado em MODO DEBUG")
        logging.info("=" * 50)

def main():
    """Função principal"""
    # Parse argumentos de linha de comando
    parser = argparse.ArgumentParser(description='WinSysMonitor - Monitor de atividades')
    parser.add_argument('--debug', '-d', action='store_true', 
                       help='Ativa modo debug (gera logs detalhados)')
    args = parser.parse_args()
    
    # Configura logging
    setup_logging(args.debug)
    
    try:
        # Inicializar e rodar monitor
        monitor = ActivityMonitor(debug_mode=args.debug)
        monitor.start()
    except KeyboardInterrupt:
        pass
    except Exception as e:
        logging.error(f"Erro fatal: {str(e)}")

if __name__ == "__main__":
    main()
