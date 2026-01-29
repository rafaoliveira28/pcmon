import React, { useState, useEffect, useCallback } from 'react';
import { User, TrendingUp, Clock, Calendar, Activity, BarChart3, Zap, CheckCircle, XCircle, Printer } from 'lucide-react';
import { userService } from '../services/api';
import FilterBar from '../components/FilterBar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import axios from 'axios';

const API_URL = 'http://localhost:8090/api';
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
  const [filters, setFilters] = useState({});
  const [statistics, setStatistics] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserStats();
      loadAllApplications();
      loadStatistics();
    }
  }, [selectedUser, refreshTrigger]);

  useEffect(() => {
    if (selectedUser && showAllApps) {
      loadAllApplications();
    }
  }, [appFilter, showAllApps]);

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
      const params = { ...filters };
      if (dateRange.start && dateRange.end) {
        params.start_date = dateRange.start;
        params.end_date = dateRange.end;
      }
      
      // Remover filtros vazios
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });
      
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
  
  const loadStatistics = async () => {
    if (!selectedUser) return;
    
    try {
      const params = { ...filters, username: selectedUser };
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      
      // Remover filtros vazios
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });
      
      const response = await axios.get(`${API_URL}/activity-period-statistics`, { params });
      
      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setStatistics(null);
    }
  };

  const loadAllApplications = async () => {
    if (!selectedUser) return;
    
    try {
      const params = { ...filters };
      if (dateRange.start && dateRange.end) {
        params.start_date = dateRange.start;
        params.end_date = dateRange.end;
      }
      if (appFilter) {
        params.app = appFilter;
      }
      
      // Remover filtros vazios
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });
      
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
      const params = { ...filters };
      if (dateRange.start && dateRange.end) {
        params.start_date = dateRange.start;
        params.end_date = dateRange.end;
      }
      
      // Remover filtros vazios
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });
      
      const response = await userService.getApplicationActivities(selectedUser, executable, params);
      if (response.success) {
        setAppActivities(response.data);
        setSelectedApp(executable);
      }
    } catch (error) {
      console.error('Erro ao carregar atividades do aplicativo:', error);
    }
  };
  
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // Trigger refresh when filters change
    setRefreshTrigger(prev => prev + 1);
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

  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };
  
  const formatTime = (seconds) => {
    if (!seconds) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
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
    <div className="w-full px-6 py-8" style={{ maxWidth: '90vw', margin: '0 auto' }}>
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <User size={32} className="text-primary-600" />
              Análise por Usuário
            </h1>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Printer size={16} />
            Imprimir
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione o Usuário
            </label>
            <select
              value={selectedUser || ''}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              {users.map((user) => (
                <option key={user.username} value={user.username}>
                  {user.username}
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
              onChange={(e) => {
                setDateRange(prev => ({ ...prev, start: e.target.value }));
                setRefreshTrigger(prev => prev + 1);
              }}
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
              onChange={(e) => {
                setDateRange(prev => ({ ...prev, end: e.target.value }));
                setRefreshTrigger(prev => prev + 1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
        
        <FilterBar onFilterChange={handleFilterChange} showTimeFilters={true} />
      </div>
      
      {/* Cartões de Estatísticas de Tempo Ativo/Inativo */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Tempo Ativo</p>
                <h3 className="text-3xl font-bold mt-2">{formatTime(statistics.active_seconds)}</h3>
                <p className="text-green-100 text-sm mt-1">{statistics.active_periods} períodos</p>
              </div>
              <CheckCircle size={48} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Tempo Inativo</p>
                <h3 className="text-3xl font-bold mt-2">{formatTime(statistics.inactive_seconds)}</h3>
                <p className="text-red-100 text-sm mt-1">{statistics.inactive_periods} períodos</p>
              </div>
              <XCircle size={48} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Taxa de Atividade</p>
                <h3 className="text-3xl font-bold mt-2">{statistics.active_percentage.toFixed(1)}%</h3>
                <p className="text-blue-100 text-sm mt-1">Total: {formatTime(statistics.total_seconds)}</p>
              </div>
              <Clock size={48} className="opacity-80" />
            </div>
          </div>
        </div>
      )}

      {userStats && (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
                  <p className="text-purple-100 text-sm font-medium">Aplicativos Únicos</p>
                  <p className="text-3xl font-bold mt-2">{userStats.general.unique_apps}</p>
                  <p className="text-purple-100 text-xs mt-1">programas diferentes</p>
                </div>
                <Activity className="opacity-50" size={48} />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Sessão Média</p>
                  <p className="text-3xl font-bold mt-2">{formatDuration(userStats.general.avg_session_seconds)}</p>
                  <p className="text-green-100 text-xs mt-1">por atividade</p>
                </div>
                <Zap className="opacity-50" size={48} />
              </div>
            </div>
          </div>

          {/* Top 10 Aplicativos - Gráfico de Barras */}
          {userStats.top_apps.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 size={24} className="text-primary-600" />
                Top 10 Aplicativos Mais Utilizados
              </h2>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={userStats.top_apps}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="executable" 
                    angle={-35} 
                    textAnchor="end" 
                    height={120}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis label={{ value: 'Horas', angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    formatter={(value) => {
                      const hours = Math.floor(value);
                      const minutes = Math.floor((value % 1) * 60);
                      return [`${hours}h ${minutes}m`, 'Tempo de Uso'];
                    }}
                  />
                  <Bar dataKey="total_hours" fill="#0ea5e9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Distribuição de Tempo - Gráfico de Pizza */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Distribuição de Tempo (Top 8)
              </h2>
              <ResponsiveContainer width="100%" height={450}>
                <PieChart>
                  <Pie
                    data={userStats.top_apps.slice(0, 8)}
                    cx="50%"
                    cy="35%"
                    labelLine={false}
                    label={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="total_hours"
                    nameKey="executable"
                  >
                    {userStats.top_apps.slice(0, 8).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const hours = Math.floor(value);
                      const minutes = Math.floor((value % 1) * 60);
                      return [`${hours}h ${minutes}m`, 'Tempo'];
                    }}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={80}
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value, entry) => {
                      const hours = Math.floor(entry.payload.total_hours);
                      const minutes = Math.floor((entry.payload.total_hours % 1) * 60);
                      return `${value}: ${hours}h ${minutes}m`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela Detalhada Top 10 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Detalhamento dos Top 10 Aplicativos
              </h2>
              <div className="overflow-y-auto" style={{ maxHeight: '410px' }}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aplicativo</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Horas</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Acessos</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {userStats.top_apps.map((app, index) => {
                      const hours = Math.floor(app.total_hours);
                      const minutes = Math.floor((app.total_hours % 1) * 60);
                      return (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-3 text-center text-sm font-bold text-gray-900">{index + 1}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">{app.executable}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right tabular-nums">
                            {hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 text-right tabular-nums">{app.access_count}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Análise por Horário */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {userStats.by_hour.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Atividade por Hora do Dia
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userStats.by_hour}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" label={{ value: 'Hora', position: 'insideBottom', offset: -5 }} />
                    <YAxis label={{ value: 'Horas', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value) => {
                        const hours = Math.floor(value);
                        const minutes = Math.floor((value % 1) * 60);
                        return [`${hours}h ${minutes}m`, 'Tempo Total'];
                      }}
                      labelFormatter={(label) => `${label}:00`}
                    />
                    <Line type="monotone" dataKey="total_hours" stroke="#0ea5e9" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {userStats.by_weekday.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Atividade por Dia da Semana
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={userStats.by_weekday}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="weekday" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis label={{ value: 'Horas', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value) => {
                        const hours = Math.floor(value);
                        const minutes = Math.floor((value % 1) * 60);
                        return [`${hours}h ${minutes}m`, 'Tempo Total'];
                      }}
                    />
                    <Bar dataKey="total_hours" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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

          {/* Atividades Recentes com Opção de Ver Todos os Aplicativos */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {showAllApps ? 'Todos os Aplicativos' : 'Atividades Recentes'}
              </h2>
              <button
                onClick={() => setShowAllApps(!showAllApps)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                {showAllApps ? 'Ver Atividades Recentes' : 'Ver Todos os Aplicativos'}
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
                          className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
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
