"""
Activity Monitor - Monitora atividades do usuário
"""
import win32gui
import win32process
import win32api
import psutil
import time
import requests
import json
import socket
import getpass
from datetime import datetime
from config import Config
import logging
import ctypes

class LASTINPUTINFO(ctypes.Structure):
    _fields_ = [
        ('cbSize', ctypes.c_uint),
        ('dwTime', ctypes.c_uint),
    ]

class ActivityMonitor:
    def __init__(self, debug_mode=False):
        self.running = False
        self.current_activity = None
        self.current_activity_id = None  # ID do registro atual no banco
        self.last_checkpoint_time = None  # Controla quando foi o último checkpoint
        self.last_windows_snapshot_time = None  # Controla snapshot de janelas
        self.last_mouse_activity_time = None  # Controla envio de atividade do mouse
        self.current_period_type = None  # 'active' ou 'inactive'
        self.current_period_start = None  # Início do período atual
        self.idle_threshold = 60  # Segundos de inatividade para considerar ausente
        self.config = Config()
        self.hostname = socket.gethostname()
        self.username = getpass.getuser()
        self.debug_mode = debug_mode
        
        if self.debug_mode:
            logging.info(f"Monitor inicializado para {self.username}@{self.hostname}")
            logging.info(f"URL da API: {self.config.API_URL}")
    
    def get_last_input_time(self):
        """Retorna o tempo em segundos desde o último input (mouse/teclado)"""
        try:
            last_input_info = LASTINPUTINFO()
            last_input_info.cbSize = ctypes.sizeof(LASTINPUTINFO)
            ctypes.windll.user32.GetLastInputInfo(ctypes.byref(last_input_info))
            
            millis_since_boot = ctypes.windll.kernel32.GetTickCount()
            millis_since_input = millis_since_boot - last_input_info.dwTime
            
            return millis_since_input / 1000.0  # Converte para segundos
        except Exception as e:
            logging.error(f"Erro ao obter last input time: {str(e)}")
            return 0
    
    def send_mouse_activity(self):
        """Envia timestamp da última atividade do mouse/teclado"""
        try:
            idle_seconds = self.get_last_input_time()
            # Só envia se houve atividade recente (menos de 5 segundos de idle)
            if idle_seconds < 5:
                url = f"{self.config.API_URL}/api/mouse-activity"
                data = {
                    'hostname': self.hostname,
                    'username': self.username,
                    'last_activity': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                }
                
                response = requests.post(
                    url,
                    json=data,
                    timeout=10,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code in [200, 201]:
                    if self.debug_mode:
                        logging.info(f"Mouse activity enviada (idle: {idle_seconds:.1f}s)")
                else:
                    logging.error(f"Erro ao enviar mouse activity: Status {response.status_code}")
                    
        except requests.exceptions.RequestException as e:
            logging.error(f"Erro de conexão ao enviar mouse activity: {str(e)}")
        except Exception as e:
            logging.error(f"Erro ao enviar mouse activity: {str(e)}")
    
    def check_and_update_activity_period(self):
        """Verifica mudanças de estado (ativo/inativo) e registra períodos"""
        try:
            idle_seconds = self.get_last_input_time()
            current_state = 'active' if idle_seconds < self.idle_threshold else 'inactive'
            
            # Se mudou de estado ou é a primeira vez
            if self.current_period_type != current_state:
                now = datetime.now()
                
                # Finalizar período anterior se existir
                if self.current_period_type is not None and self.current_period_start is not None:
                    duration = (now - self.current_period_start).total_seconds()
                    if duration >= 1:  # Só registra se durou pelo menos 1 segundo
                        self.send_activity_period(
                            self.current_period_type,
                            self.current_period_start,
                            now,
                            int(duration)
                        )
                
                # Iniciar novo período
                self.current_period_type = current_state
                self.current_period_start = now
                
                if self.debug_mode:
                    logging.info(f"Mudança de estado: {current_state} (idle: {idle_seconds:.1f}s)")
                    
        except Exception as e:
            logging.error(f"Erro ao verificar período de atividade: {str(e)}")
    
    def send_activity_period(self, period_type, start_time, end_time, duration_seconds):
        """Envia período de atividade/inatividade para o servidor"""
        try:
            url = f"{self.config.API_URL}/api/activity-periods"
            data = {
                'hostname': self.hostname,
                'username': self.username,
                'period_type': period_type,
                'start_time': start_time.strftime('%Y-%m-%d %H:%M:%S'),
                'end_time': end_time.strftime('%Y-%m-%d %H:%M:%S'),
                'duration_seconds': duration_seconds
            }
            
            response = requests.post(
                url,
                json=data,
                timeout=10,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code in [200, 201]:
                if self.debug_mode:
                    logging.info(f"Período {period_type} registrado: {duration_seconds}s")
            else:
                logging.error(f"Erro ao enviar período: Status {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            logging.error(f"Erro de conexão ao enviar período: {str(e)}")
        except Exception as e:
            logging.error(f"Erro ao enviar período: {str(e)}")
    
    def get_all_open_windows(self):
        """Obtém todas as janelas abertas no sistema"""
        windows = []
        active_hwnd = win32gui.GetForegroundWindow()
        
        def enum_windows_callback(hwnd, windows_list):
            if win32gui.IsWindowVisible(hwnd):
                window_title = win32gui.GetWindowText(hwnd)
                if window_title:  # Só adiciona janelas com título
                    try:
                        _, pid = win32process.GetWindowThreadProcessId(hwnd)
                        process = psutil.Process(pid)
                        executable = process.name()
                        
                        windows_list.append({
                            'executable': executable,
                            'pid': pid,
                            'window_title': window_title,
                            'is_active': (hwnd == active_hwnd)
                        })
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
        
        try:
            win32gui.EnumWindows(enum_windows_callback, windows)
            return windows
        except Exception as e:
            logging.error(f"Erro ao enumerar janelas: {str(e)}")
            return []
    
    def send_windows_snapshot(self):
        """Envia snapshot de todas as janelas abertas"""
        try:
            windows = self.get_all_open_windows()
            if not windows:
                return
            
            url = f"{self.config.API_URL}/api/windows-snapshot"
            data = {
                'hostname': self.hostname,
                'username': self.username,
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'windows': windows
            }
            
            response = requests.post(
                url,
                json=data,
                timeout=10,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code in [200, 201]:
                if self.debug_mode:
                    logging.info(f"Snapshot enviado: {len(windows)} janelas abertas")
            else:
                logging.error(f"Erro ao enviar snapshot: Status {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            logging.error(f"Erro de conexão ao enviar snapshot: {str(e)}")
        except Exception as e:
            logging.error(f"Erro ao enviar snapshot: {str(e)}")
        
    def get_active_window_info(self):
        """Obtém informações da janela ativa"""
        try:
            hwnd = win32gui.GetForegroundWindow()
            if not hwnd:
                return None
                
            # Obtém o título da janela
            window_title = win32gui.GetWindowText(hwnd)
            if not window_title:
                return None
            
            # Obtém o PID do processo
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            
            # Obtém informações do processo
            try:
                process = psutil.Process(pid)
                executable = process.name()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                executable = "Unknown"
            
            info = {
                'hostname': self.hostname,
                'username': self.username,
                'executable': executable,
                'pid': pid,
                'window_title': window_title,
                'timestamp': datetime.now()
            }
            
            if self.debug_mode:
                logging.debug(f"Janela detectada: {executable} - {window_title[:50]}")
            
            return info
            
        except Exception as e:
            logging.error(f"Erro ao obter janela ativa: {str(e)}")
            return None
    
    def send_activity(self, activity_data, is_checkpoint=False):
        """Envia atividade para a API"""
        try:
            # Prepara os dados
            data = {
                'hostname': activity_data['hostname'],
                'username': activity_data['username'],
                'executable': activity_data['executable'],
                'pid': activity_data['pid'],
                'window_title': activity_data['window_title'],
                'start_time': activity_data['start_time'].strftime('%Y-%m-%d %H:%M:%S.%f'),
                'end_time': activity_data['end_time'].strftime('%Y-%m-%d %H:%M:%S.%f'),
                'duration_seconds': activity_data['duration_seconds']
            }
            
            # Se é checkpoint e já temos um ID, faz UPDATE
            if is_checkpoint and self.current_activity_id:
                url = f"{self.config.API_URL}/api/window-activity/{self.current_activity_id}"
                response = requests.put(
                    url,
                    json=data,
                    timeout=10,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code in [200, 201]:
                    if self.debug_mode:
                        logging.info(f"Checkpoint atualizado (ID {self.current_activity_id}): {data['executable']} - {data['window_title'][:30]} ({data['duration_seconds']:.1f}s)")
                else:
                    logging.error(f"Erro ao atualizar checkpoint: Status {response.status_code}")
            else:
                # Nova atividade - faz INSERT
                url = f"{self.config.API_URL}/api/window-activity"
                response = requests.post(
                    url,
                    json=data,
                    timeout=10,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code in [200, 201]:
                    # Salva o ID retornado para futuros checkpoints
                    response_data = response.json()
                    if response_data.get('success') and 'data' in response_data:
                        self.current_activity_id = response_data['data'].get('id')
                    
                    if self.debug_mode:
                        logging.info(f"Nova atividade enviada (ID {self.current_activity_id}): {data['executable']} - {data['window_title'][:30]} ({data['duration_seconds']:.1f}s)")
                else:
                    logging.error(f"Erro ao enviar atividade: Status {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            logging.error(f"Erro de conexão com API: {str(e)}")
        except Exception as e:
            logging.error(f"Erro ao enviar atividade: {str(e)}")
    
    def start(self):
        """Inicia o monitoramento"""
        self.running = True
        last_activity = None
        checkpoint_interval = 60  # Envia dados a cada 60 segundos (1 minuto) para tempo real
        snapshot_interval = 10  # Envia snapshot de janelas a cada 10 segundos
        mouse_activity_interval = 5  # Envia atividade do mouse a cada 5 segundos
        period_check_interval = 10  # Verifica mudanças de estado a cada 10 segundos
        last_period_check = None
        
        while self.running:
            try:
                # Envia snapshot de todas as janelas abertas (a cada 10 segundos)
                if self.last_windows_snapshot_time is None or \
                   (datetime.now() - self.last_windows_snapshot_time).total_seconds() >= snapshot_interval:
                    self.send_windows_snapshot()
                    self.last_windows_snapshot_time = datetime.now()
                
                # Envia atividade do mouse/teclado (a cada 5 segundos)
                if self.last_mouse_activity_time is None or \
                   (datetime.now() - self.last_mouse_activity_time).total_seconds() >= mouse_activity_interval:
                    self.send_mouse_activity()
                    self.last_mouse_activity_time = datetime.now()
                
                # Verifica mudanças de estado ativo/inativo (a cada 10 segundos)
                if last_period_check is None or \
                   (datetime.now() - last_period_check).total_seconds() >= period_check_interval:
                    self.check_and_update_activity_period()
                    last_period_check = datetime.now()
                    self.last_mouse_activity_time = datetime.now()
                
                # Obtém informações da janela ativa
                current_info = self.get_active_window_info()
                
                if current_info:
                    # Cria identificador único da atividade
                    activity_id = f"{current_info['executable']}_{current_info['window_title']}"
                    
                    # Se mudou a atividade
                    if last_activity is None or activity_id != last_activity['id']:
                        # Finaliza atividade anterior
                        if last_activity:
                            end_time = datetime.now()
                            duration = (end_time - last_activity['start_time']).total_seconds()
                            
                            # Só envia se duração >= 1 segundo
                            if duration >= 1:
                                activity_data = {
                                    'hostname': last_activity['hostname'],
                                    'username': last_activity['username'],
                                    'executable': last_activity['executable'],
                                    'pid': last_activity['pid'],
                                    'window_title': last_activity['window_title'],
                                    'start_time': last_activity['start_time'],
                                    'end_time': end_time,
                                    'duration_seconds': duration
                                }
                                # Finaliza atividade anterior (não é checkpoint)
                                self.send_activity(activity_data, is_checkpoint=False)
                        
                        # Inicia nova atividade (reseta o ID)
                        self.current_activity_id = None
                        self.last_checkpoint_time = current_info['timestamp']
                        last_activity = {
                            'id': activity_id,
                            'hostname': current_info['hostname'],
                            'username': current_info['username'],
                            'executable': current_info['executable'],
                            'pid': current_info['pid'],
                            'window_title': current_info['window_title'],
                            'start_time': current_info['timestamp']
                        }
                        
                        if self.debug_mode:
                            logging.debug(f"Nova atividade iniciada: {current_info['executable']}")
                    
                    # Checkpoint em tempo real: envia dados a cada 1 minuto
                    elif last_activity:
                        # Calcula tempo desde o último checkpoint (não desde o início)
                        time_since_checkpoint = (datetime.now() - self.last_checkpoint_time).total_seconds()
                        
                        if time_since_checkpoint >= checkpoint_interval:
                            end_time = datetime.now()
                            # Duração total desde o início da atividade
                            total_duration = (end_time - last_activity['start_time']).total_seconds()
                            
                            activity_data = {
                                'hostname': last_activity['hostname'],
                                'username': last_activity['username'],
                                'executable': last_activity['executable'],
                                'pid': last_activity['pid'],
                                'window_title': last_activity['window_title'],
                                'start_time': last_activity['start_time'],
                                'end_time': end_time,
                                'duration_seconds': total_duration
                            }
                            # Envia como checkpoint (vai fazer UPDATE se tiver ID)
                            self.send_activity(activity_data, is_checkpoint=True)
                            
                            if self.debug_mode:
                                logging.info(f"Checkpoint enviado: {last_activity['executable']} ({total_duration:.1f}s total)")
                            
                            # Atualiza apenas o tempo do último checkpoint
                            self.last_checkpoint_time = datetime.now()
                
                # Aguarda 2 segundos antes da próxima verificação
                time.sleep(2)
                
            except Exception as e:
                logging.error(f"Erro no loop de monitoramento: {str(e)}")
                time.sleep(5)
        
        # Finaliza última atividade ao parar
        if last_activity:
            end_time = datetime.now()
            duration = (end_time - last_activity['start_time']).total_seconds()
            if duration >= 1:
                activity_data = {
                    'hostname': last_activity['hostname'],
                    'username': last_activity['username'],
                    'executable': last_activity['executable'],
                    'pid': last_activity['pid'],
                    'window_title': last_activity['window_title'],
                    'start_time': last_activity['start_time'],
                    'end_time': end_time,
                    'duration_seconds': duration
                }
                # Finalização (não é checkpoint)
                self.send_activity(activity_data, is_checkpoint=False)
    
    def stop(self):
        """Para o monitoramento"""
        self.running = False
