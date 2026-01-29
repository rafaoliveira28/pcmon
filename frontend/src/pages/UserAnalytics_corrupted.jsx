import React, { useState, useEffect } from 'react';
import { User, TrendingUp, Clock, Calendar, Activity, BarChart3, Zap } from 'lucide-react';
import { userService } from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

const COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

const UserAnalytics = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [allApplications, setAllApplications] = useState([]);
  const [filteredApps, setFilteredApps] = useState([]);
  const [appFilter, setAppFilter] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [appActivities, setAppActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showAllApps, setShowAllApps] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserStats();
      loadAllApplications();
    }
  }, [selectedUser, dateRange]);

  const loadUsers = async () => {
    try {
      const response = await userService.getAll();
      if (response.success) {
        setUsers(response.data);
        if (response.data.length > 0) {
          setSelectedUser(response.data[0].username);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const loadUserStats = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      const params = {};
      if (dateRange.start && dateRange.end) {
        params.start_date = dateRange.start;
        params.end_date = dateRange.end;
      }
      
      const response = await userService.getStats(selectedUser, params);
      if (response.success) {
        setUserStats(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllApplications = async () => {
    if (!selectedUser) return;
    
    try {
      const params = {};
      if (dateRange.start && dateRange.end) {
        params.start_date = dateRange.start;
        params.end_date = dateRange.end;
      }
      if (appFilter) {
        params.app = appFilter;
      }
      
      const response = await userService.getApplications(selectedUser, params);
      if (response.success) {
        setAllApplications(response.data);
        setFilteredApps(response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar aplicativos:', error);
    }
  };

  const loadAppActivities = async (executable) => {
    if (!selectedUser || !executable) return;
    
    try {
      const params = {};
      if (dateRange.start && dateRange.end) {
        params.start_date = dateRange.start;
        params.end_date = dateRange.end;
      }
      
      const response = await userService.getApplicationActivities(selectedUser, executable, params);
      if (response.success) {
        setAppActivities(response.data);
        setSelectedApp(executable);
      }
    } catch (error) {
      console.error('Erro ao carregar atividades do aplicativo:', error);
    }
  };

  const handleAppFilterChange = (value) => {
    setAppFilter(value);
    if (value === '') {
      setFilteredApps(allApplications);
    } else {
      const filtered = allApplications.filter(app => 
        app.executable.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredApps(filtered);
    }
  };

  useEffect(() => {
    if (selectedUser && showAllApps) {
      loadAllApplications();
    }
  }, [appFilter, showAllApps]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatHours = (seconds) => {
    return (seconds / 3600).toFixed(2);
  };

  if (loading && !userStats) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Análise por Usuário</h1>
        <p className="text-gray-600 mt-2">Estatísticas detalhadas e análise de produtividade</p>
      </div>

      {/* Seletor de Usuário e Filtros */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecionar Usuário
            </label>
            <select
              value={selectedUser || ''}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {users.map((user) => (
                <option key={`${user.username}-${user.hostname}`} value={user.username}>
                  {user.username} ({user.hostname})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Inicial
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Final
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {userStats && (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Tempo Total</p>
                  <p className="text-3xl font-bold mt-2">{formatHours(userStats.general.total_time_seconds)}h</p>
                  <p className="text-blue-100 text-xs mt-1">{userStats.general.total_activities} atividades</p>
                </div>
                <Clock className="opacity-50" size={48} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Aplicativos</p>
                  <p className="text-3xl font-bold mt-2">{userStats.general.unique_apps}</p>
                  <p className="text-purple-100 text-xs mt-1">Únicos</p>
                </div>
                <Activity className="opacity-50" size={48} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Dias Ativos</p>
                  <p className="text-3xl font-bold mt-2">{userStats.general.active_days}</p>
                  <p className="text-green-100 text-xs mt-1">no período</p>
                </div>
                <Calendar className="opacity-50" size={48} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Média por Sessão</p>
                  <p className="text-3xl font-bold mt-2">{formatDuration(userStats.general.avg_session_seconds)}</p>
                  <p className="text-orange-100 text-xs mt-1">tempo médio</p>
                </div>
                <TrendingUp className="opacity-50" size={48} />
              </div>
            </div>
          </div>

          {/* Top 10 Aplicativos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                Top 10 Aplicativos por Tempo de Uso
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={userStats.top_apps} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="executable" type="category" width={150} />
                  <Tooltip formatter={(value) => `${formatHours(value)}h`} />
                  <Bar dataKey="total_seconds" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Distribuição de Tempo por Aplicativo
              </h2>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={userStats.top_apps.slice(0, 8)}
                    dataKey="total_seconds"
                    nameKey="executable"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={(entry) => `${entry.executable.substring(0, 15)}`}
                  >
                    {userStats.top_apps.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${formatHours(value)}h`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabela Detalhada Top 10 */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Detalhamento dos Top 10 Aplicativos
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aplicativo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acessos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tempo Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Média por Acesso</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Maior Sessão</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userStats.top_apps.map((app, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {app.executable}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {app.access_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {app.total_hours}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDuration(app.avg_seconds)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDuration(app.max_seconds)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Análise por Horário */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {userStats.by_hour.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Atividade por Hora do Dia
                </h2>
            
            {!showAllApps ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aplicativo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Início</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duração</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userStats.recent_activities.map((activity) => (
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {activity.executable}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                          {activity.window_title || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(activity.start_time), "dd/MM HH:mm", { locale: ptBR })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDuration(activity.duration_second)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                {/* Filtro de Aplicativos */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={appFilter}
                    onChange={(e) => handleAppFilterChange(e.target.value)}
                    placeholder="Filtrar por nome do aplicativo..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    {filteredApps.length} aplicativo(s) encontrado(s)
                  </p>
                </div>

                {/* Lista de Todos os Aplicativos */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aplicativo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acessos</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tempo Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Média</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dias Ativos</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredApps.map((app, index) => (
                        <tr key={app.executable} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {app.executable}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {app.access_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {app.total_hours}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDuration(app.avg_seconds)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {app.active_days}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => loadAppActivities(app.executable)}
                              className="text-primary-600 hover:text-primary-800 font-medium"
                            >
                              Ver Detalhes
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Modal de Detalhes do Aplicativo */}
                {selectedApp && appActivities.length > 0 && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedApp(null)}>
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-gray-900">
                          Atividades - {selectedApp}
                        </h3>
                        <button
                          onClick={() => setSelectedApp(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="p-6">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título da Janela</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Início</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fim</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duração</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {appActivities.map((activity) => (
                                <tr key={activity.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                                    {activity.window_title || '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {format(new Date(activity.start_time), "dd/MM HH:mm:ss", { locale: ptBR })}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {activity.end_time ? format(new Date(activity.end_time), "dd/MM HH:mm:ss", { locale: ptBR }) : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {formatDuration(activity.duration_second)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Timeline */}
          {userStats.timeline && userStats.timeline.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Timeline - Últimos 7 Dias
              </h2>
              <div className="space-y-4">
                {userStats.timeline.map((day) => (
                  <div key={day.date} className="flex items-center border-l-4 border-primary-500 pl-4 py-3 hover:bg-gray-50 rounded-r">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {format(new Date(day.date), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      <div className="flex gap-4 mt-1 text-sm text-gray-600">
                        <span>{day.activities} atividades</span>
                        <span>•</span>
                        <span>{day.unique_apps} aplicativos</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary-600">{day.total_hours}h</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Atividades Recentes */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Atividades Recentes
              </h2>
              <button
                onClick={() => setShowAllApps(!showAllApps)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {showAllApps ? 'Ocultar Todos' : 'Ver Todos os Aplicativos'}
              </button>
            </div>
            
            {!showAllApps ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aplicativo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Início</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duração</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userStats.recent_activities.map((activity) => (
                      <tr key={activity.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {activity.executable}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                          {activity.window_title || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(activity.start_time), "dd/MM HH:mm", { locale: ptBR })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatDuration(activity.duration_second)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                {/* Filtro de Aplicativos */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={appFilter}
                    onChange={(e) => handleAppFilterChange(e.target.value)}
                    placeholder="Filtrar por nome do aplicativo..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    {filteredApps.length} aplicativo(s) encontrado(s)
                  </p>
                </div>

                {/* Lista de Todos os Aplicativos */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aplicativo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acessos</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tempo Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Média</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dias Ativos</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredApps.map((app, index) => (
                        <tr key={app.executable} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                              {app.executable}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {app.access_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {app.total_hours}h
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDuration(app.avg_seconds)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {app.active_days}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => loadAppActivities(app.executable)}
                              className="text-primary-600 hover:text-primary-800 font-medium"
                            >
                              Ver Detalhes
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Modal de Detalhes do Aplicativo */}
                {selectedApp && appActivities.length > 0 && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedApp(null)}>
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-gray-900">
                          Atividades - {selectedApp}
                        </h3>
                        <button
                          onClick={() => setSelectedApp(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="p-6">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Título da Janela</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Início</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fim</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duração</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {appActivities.map((activity) => (
                                <tr key={activity.id} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 text-sm text-gray-900 max-w-md truncate">
                                    {activity.window_title || '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {format(new Date(activity.start_time), "dd/MM HH:mm:ss", { locale: ptBR })}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {activity.end_time ? format(new Date(activity.end_time), "dd/MM HH:mm:ss", { locale: ptBR }) : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {formatDuration(activity.duration_second)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UserAnalytics;
