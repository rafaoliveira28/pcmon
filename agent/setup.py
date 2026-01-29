"""
Setup para criar executável do WinSysMonitor
"""
from cx_Freeze import setup, Executable
import sys
import os

# Encontrar DLLs do pywin32
try:
    import win32api
    win32_path = os.path.dirname(win32api.__file__)
    pywin32_dll_path = os.path.join(win32_path, "pywin32_system32")
except ImportError:
    pywin32_dll_path = None

# Listar arquivos a incluir
include_files = [
    ("config.json.template", "config.json")
]

# Adicionar DLLs do pywin32 se existirem
if pywin32_dll_path and os.path.exists(pywin32_dll_path):
    for dll in os.listdir(pywin32_dll_path):
        if dll.endswith('.dll'):
            dll_path = os.path.join(pywin32_dll_path, dll)
            include_files.append((dll_path, dll))

# Configurações do executável
build_exe_options = {
    "packages": [
        "psutil",
        "requests",
        "urllib3",
        "win32gui",
        "win32process",
        "win32api",
        "pywintypes",
        "win32con"
    ],
    "includes": [
        "http.client",
        "urllib.parse",
        "urllib.request"
    ],
    "include_files": include_files,
    "excludes": [
        "tkinter", 
        "unittest", 
        "email", 
        "html", 
        "xml",
        "test"
    ],
    "optimize": 2,
    "include_msvcr": True,
}

setup(
    name="WinSysMonitor",
    version="1.0.0",
    description="Windows System Monitor",
    options={
        "build_exe": build_exe_options,
    },
    executables=[
        Executable(
            "main.py",
            base="gui",  # Sem console
            target_name="WinSysMonitor.exe",
            icon=None
        )
    ]
)
