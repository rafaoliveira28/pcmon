import React, { useState, useEffect, useCallback } from 'react';
import { Monitor, Circle, RefreshCw, Eye, X, Activity, Clock, TrendingUp, Maximize2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { computerService } from '../services/api';

const Computers = () => {
  const [computers, setComputers] = useState([]);
  const [filteredComputers, setFilteredComputers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [usernameFilter, setUsernameFilter] = useState('');
  const [hostnameFilter, setHostnameFilter] = useState('');
  const [selectedComputer, setSelectedComputer] = useState(null);
  const [windowsSnapshot, setWindowsSnapshot] = useState(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState(null);

  const loadComputers = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // O endpoint /api/computers já retorna o status correto
      const computersResponse = await computerService.getAll();
      
      if (computersResponse.success) {
        setComputers(computersResponse.data);
      }
    } catch (error) {
      console.error('Erro ao carregar computadores:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
      setInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    loadComputers();
    const interval = setInterval(() => loadComputers(false), 30000);
    return () => clearInterval(interval);
  }, [loadComputers]);

  useEffect(() => {
    applyFilters();
  }, [computers, statusFilter, usernameFilter, hostnameFilter]);

  useEffect(() => {
    let interval;
    if (showModal && selectedComputer) {
      loadWindowsSnapshot();
      interval = setInterval(loadWindowsSnapshot, 5000);
    }
    return () => clearInterval(interval);
  }, [showModal, selectedComputer]);

  const applyFilters = () => {
    let filtered = [...computers];

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Filtro por usuário
    if (usernameFilter) {
      filtered = filtered.filter(c => 
        c.username.toLowerCase().includes(usernameFilter.toLowerCase())
      );
    }

    // Filtro por hostname
    if (hostnameFilter) {
      filtered = filtered.filter(c => 
        c.hostname.toLowerCase().includes(hostnameFilter.toLowerCase())
      );
    }

    setFilteredComputers(filtered);
  };

  const loadWindowsSnapshot = async () => {
    if (!selectedComputer) return;
    
    try {
      setActivityLoading(true);
      const response = await computerService.getWindowsSnapshot(
        selectedComputer.hostname,
        selectedComputer.username
      );
      
      if (response.success) {
        setWindowsSnapshot(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar snapshot:', error);
      setWindowsSnapshot(null);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleViewDetails = (computer) => {
    setSelectedComputer(computer);
    setShowModal(true);
    setWindowsSnapshot(null);
    setSelectedWindow(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedComputer(null);
    setWindowsSnapshot(null);
    setSelectedWindow(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-yellow-600 bg-yellow-100';
      case 'offline': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      case 'offline': return 'Offline';
      default: return status;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  // Obter lista única de usuários e hostnames para os filtros
  const uniqueUsernames = [...new Set(computers.map(c => c.username))];
  const uniqueHostnames = [...new Set(computers.map(c => c.hostname))];

  const statusCounts = {
    all: computers.length,
    active: computers.filter(c => c.status === 'active').length,
    inactive: computers.filter(c => c.status === 'inactive').length,
    offline: computers.filter(c => c.status === 'offline').length,
  };

  return (
    <div className="w-full px-6 py-8" style={{ maxWidth: '90vw', margin: '0 auto' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Computadores</h1>
          <p className="text-gray-600 mt-2">
            Gerenciamento de computadores monitorados
          </p>
        </div>
        <button
          onClick={() => loadComputers(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      {/* Filtros de Status */}
      <div className="flex gap-4 mb-6">
        {[
          { key: 'all', label: 'Todos', count: statusCounts.all },
          { key: 'active', label: 'Ativos', count: statusCounts.active },
          { key: 'inactive', label: 'Inativos', count: statusCounts.inactive },
          { key: 'offline', label: 'Offline', count: statusCounts.offline },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statusFilter === key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Filtros por Usuário e Hostname */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Usuário
            </label>
            <input
              type="text"
              placeholder="Digite o nome do usuário..."
              value={usernameFilter}
              onChange={(e) => setUsernameFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filtrar por Computador
            </label>
            <input
              type="text"
              placeholder="Digite o hostname..."
              value={hostnameFilter}
              onChange={(e) => setHostnameFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        {(usernameFilter || hostnameFilter) && (
          <div className="mt-3 text-sm text-gray-600">
            Mostrando {filteredComputers.length} de {computers.length} computadores
          </div>
        )}
      </div>

      {/* Grid de Computadores */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredComputers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Nenhum computador encontrado
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredComputers.map((computer) => (
            <div
              key={`${computer.hostname}-${computer.username}`}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Monitor className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {computer.hostname}
                    </h3>
                    <p className="text-sm text-gray-500">{computer.username}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(computer.status)}`}>
                  <Circle size={8} fill="currentColor" />
                  {getStatusLabel(computer.status)}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Última atividade:</span>
                  <span className="font-medium text-gray-900">
                    {formatDateTime(computer.last_activity)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total de atividades:</span>
                  <span className="font-medium text-gray-900">
                    {computer.total_activities}
                  </span>
                </div>
              </div>

              {/* Botão Detalhes - só aparece para active e inactive */}
              {(computer.status === 'active' || computer.status === 'inactive') && (
                <button
                  onClick={() => handleViewDetails(computer)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Eye size={16} />
                  Ver Detalhes
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Janelas Abertas em Tempo Real */}
      {showModal && selectedComputer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header do Modal */}
            <div className="bg-blue-600 text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Maximize2 size={24} />
                <div>
                  <h2 className="text-xl font-bold">Janelas Abertas em Tempo Real</h2>
                  <p className="text-blue-100 text-sm">
                    {selectedComputer.hostname} - {selectedComputer.username}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Info Bar */}
            <div className="bg-gray-50 border-b px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Circle size={10} fill="currentColor" className="text-green-500 animate-pulse" />
                <span className="text-sm text-gray-600">
                  Atualiza a cada 5 segundos
                </span>
              </div>
              {windowsSnapshot && (
                <span className="text-sm text-gray-600">
                  Última atualização: {windowsSnapshot.seconds_ago}s atrás
                </span>
              )}
            </div>

            {/* Conteúdo do Modal */}
            <div className="flex-1 overflow-hidden flex">
              {activityLoading && !windowsSnapshot ? (
                <div className="flex-1 flex justify-center items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : windowsSnapshot ? (
                <>
                  {/* Lista de Janelas - Lado Esquerdo */}
                  <div className="w-1/2 border-r overflow-y-auto p-6">
                    {/* Janela Ativa */}
                    {windowsSnapshot.active_window && (
                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Activity size={18} className="text-green-600" />
                          Janela Ativa Agora
                        </h3>
                        <div
                          onClick={() => setSelectedWindow(windowsSnapshot.active_window)}
                          className={`bg-green-50 border-2 ${
                            selectedWindow === windowsSnapshot.active_window
                              ? 'border-green-600'
                              : 'border-green-200'
                          } rounded-lg p-4 cursor-pointer hover:border-green-400 transition-all`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                                <Activity className="text-white" size={20} />
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900">
                                  {windowsSnapshot.active_window.executable}
                                </h4>
                                <p className="text-xs text-gray-500">
                                  PID: {windowsSnapshot.active_window.pid}
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-1 bg-green-600 text-white rounded text-xs font-medium">
                              ATIVA
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {windowsSnapshot.active_window.window_title}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Outras Janelas */}
                    {windowsSnapshot.other_windows && windowsSnapshot.other_windows.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Maximize2 size={18} className="text-gray-600" />
                          Outras Janelas Abertas ({windowsSnapshot.other_windows.length})
                        </h3>
                        <div className="space-y-2">
                          {windowsSnapshot.other_windows.map((window, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedWindow(window)}
                              className={`bg-white border ${
                                selectedWindow === window
                                  ? 'border-blue-500 shadow-md'
                                  : 'border-gray-200'
                              } rounded-lg p-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                                    <Monitor className="text-gray-600" size={16} />
                                  </div>
                                  <div>
                                    <h5 className="font-medium text-gray-900 text-sm">
                                      {window.executable}
                                    </h5>
                                    <p className="text-xs text-gray-500">PID: {window.pid}</p>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-1 ml-10">
                                {window.window_title}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {windowsSnapshot.total_windows === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <Maximize2 size={48} className="mx-auto mb-4 text-gray-400" />
                        <p>Nenhuma janela aberta</p>
                      </div>
                    )}
                  </div>

                  {/* Detalhes da Janela - Lado Direito */}
                  <div className="w-1/2 overflow-y-auto p-6 bg-gray-50">
                    {selectedWindow ? (
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg shadow-sm p-6">
                          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Activity size={18} />
                            Detalhes da Janela
                          </h3>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="text-xs text-gray-500 uppercase font-medium">
                                Aplicativo
                              </label>
                              <p className="text-lg font-semibold text-gray-900 mt-1">
                                {selectedWindow.executable}
                              </p>
                            </div>

                            <div>
                              <label className="text-xs text-gray-500 uppercase font-medium">
                                Título da Janela
                              </label>
                              <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-3 rounded">
                                {selectedWindow.window_title}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs text-gray-500 uppercase font-medium">
                                  Process ID
                                </label>
                                <p className="text-sm font-medium text-gray-900 mt-1">
                                  {selectedWindow.pid}
                                </p>
                              </div>
                              <div>
                                <label className="text-xs text-gray-500 uppercase font-medium">
                                  Status
                                </label>
                                <p className="mt-1">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    selectedWindow.is_active
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {selectedWindow.is_active ? 'ATIVA' : 'EM SEGUNDO PLANO'}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-sm text-blue-800">
                            {selectedWindow.is_active ? (
                              <>
                                <strong>Janela Ativa:</strong> Esta é a janela que o usuário está visualizando e interagindo no momento.
                              </>
                            ) : (
                              <>
                                <strong>Em Segundo Plano:</strong> Esta janela está aberta mas não está em foco. O usuário pode alternar para ela a qualquer momento.
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-center text-gray-500">
                        <div>
                          <Eye size={48} className="mx-auto mb-4 text-gray-400" />
                          <p>Selecione uma janela para ver detalhes</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex justify-center items-center text-gray-500">
                  <div className="text-center">
                    <Maximize2 size={48} className="mx-auto mb-4 text-gray-400" />
                    <p>Nenhum snapshot recente encontrado</p>
                    <p className="text-sm mt-2">
                      O agente pode não estar enviando dados
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
              <div className="text-sm text-gray-600">
                {windowsSnapshot && (
                  <>
                    💡 Total: <strong>{windowsSnapshot.total_windows}</strong> janelas abertas
                  </>
                )}
              </div>
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Computers;
