import React, { useState, useEffect } from 'react';
import { RefreshCw, Monitor, Users, Activity, Clock, TrendingUp, Zap, Eye, AlertCircle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { statsService, computerService } from '../services/api';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const Stats = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [computers, setComputers] = useState([]);
  const [activityStatus, setActivityStatus] = useState([]);
  const [dateFilter, setDateFilter] = useState('today');
  const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000); // Atualiza a cada 30s
    return () => clearInterval(interval);
  }, [dateFilter, customDate]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      const params = {};
      if (dateFilter === 'today') {
        params.date = format(new Date(), 'yyyy-MM-dd');
      } else if (dateFilter === 'custom') {
        params.date = customDate;
      }
      
      const [statsResponse, computersResponse, statusResponse] = await Promise.all([
        statsService.getDaily(params),
        computerService.getAll(),
        computerService.getAllActivityStatus().catch(() => ({ success: false, data: [] }))
      ]);
      
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }
      
      if (computersResponse.success) {
        setComputers(computersResponse.data);
      }
      
      if (statusResponse.success) {
        setActivityStatus(statusResponse.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calcular métricas gerais
  const totalComputers = computers.length;
  const activeComputers = activityStatus.filter(s => s.status === 'active').length;
  const inactiveComputers = activityStatus.filter(s => s.status === 'inactive').length;
  const uniqueUsers = [...new Set(computers.map(c => c.username))].length;
  
  const totalTimeToday = stats.reduce((sum, stat) => sum + parseInt(stat.total_active_time_seconds || 0), 0);
  const totalActivitiesToday = stats.reduce((sum, stat) => sum + parseInt(stat.total_activities || 0), 0);
  
  // Top usuários por tempo de uso
  const topUsersByTime = stats
    .sort((a, b) => parseInt(b.total_active_time_seconds) - parseInt(a.total_active_time_seconds))
    .slice(0, 5)
    .map(stat => ({
      name: `${stat.username}@${stat.hostname}`,
      value: parseFloat((parseInt(stat.total_active_time_seconds) / 3600).toFixed(2)),
      activities: parseInt(stat.total_activities || 0)
    }));
  
  // Top aplicativos
  const appUsage = {};
  stats.forEach(stat => {
    if (stat.most_used_app) {
      appUsage[stat.most_used_app] = (appUsage[stat.most_used_app] || 0) + 1;
    }
  });
  
  const topApps = Object.entries(appUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([app, count]) => ({
      name: app.replace('.exe', ''),
      value: count
    }));

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="w-full px-6 py-8" style={{ maxWidth: '90vw', margin: '0 auto' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Estatísticas do Sistema</h1>
          <p className="text-gray-600 mt-2">
            Visão geral e métricas em tempo real
          </p>
        </div>
        <button
          onClick={loadAllData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      {/* Filtro de Período */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Período:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === '7days'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                dateFilter === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Personalizado
            </button>
          </div>
          {dateFilter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {/* Total de Computadores */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Monitor size={32} />
                <div className="text-right">
                  <p className="text-3xl font-bold">{totalComputers}</p>
                  <p className="text-blue-100 text-sm">Computadores</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap size={16} className="text-green-300" />
                <span>{activeComputers} ativos</span>
              </div>
            </div>

            {/* Usuários Únicos */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Users size={32} />
                <div className="text-right">
                  <p className="text-3xl font-bold">{uniqueUsers}</p>
                  <p className="text-green-100 text-sm">Usuários</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Eye size={16} className="text-green-300" />
                <span>Monitorados</span>
              </div>
            </div>

            {/* Tempo Total Hoje */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <Clock size={32} />
                <div className="text-right">
                  <p className="text-3xl font-bold">{formatDuration(totalTimeToday)}</p>
                  <p className="text-purple-100 text-sm">Tempo Total</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Activity size={16} className="text-purple-300" />
                <span>{totalActivitiesToday} atividades</span>
              </div>
            </div>

            {/* Status Geral */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp size={32} />
                <div className="text-right">
                  <p className="text-3xl font-bold">
                    {totalComputers > 0 ? Math.round((activeComputers / totalComputers) * 100) : 0}%
                  </p>
                  <p className="text-orange-100 text-sm">Taxa de Atividade</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle size={16} className="text-orange-300" />
                <span>{inactiveComputers} ausentes</span>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Usuários por Tempo */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Top 5 Usuários por Tempo de Uso (horas)
              </h2>
              {topUsersByTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topUsersByTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
                              <p className="font-medium">{payload[0].payload.name}</p>
                              <p className="text-blue-600">{payload[0].value}h de uso</p>
                              <p className="text-gray-600 text-sm">{payload[0].payload.activities} atividades</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Nenhum dado disponível
                </div>
              )}
            </div>

            {/* Top Aplicativos */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Aplicativos Mais Utilizados
              </h2>
              {topApps.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topApps}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {topApps.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Nenhum dado disponível
                </div>
              )}
            </div>
          </div>

          {/* Tabela de Computadores Ativos */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Status dos Computadores em Tempo Real
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Hostname
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Usuário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Última Atividade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Inatividade
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {activityStatus.map((status, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${
                          status.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            status.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                          }`}></span>
                          {status.status === 'active' ? 'Ativo' : 'Ausente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {status.hostname}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {status.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {status.last_activity ? format(new Date(status.last_activity), 'HH:mm:ss', { locale: ptBR }) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {status.seconds_since_activity ? `${Math.round(status.seconds_since_activity)}s` : '-'}
                      </td>
                    </tr>
                  ))}
                  {activityStatus.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        Nenhum dado de atividade disponível
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabela Detalhada de Estatísticas */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Detalhamento por Usuário/Computador
            </h2>
            {stats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Hostname
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Usuário
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tempo Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Atividades
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Apps Únicos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Mais Usado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.map((stat, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {stat.hostname}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stat.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDuration(parseInt(stat.total_active_time_seconds || 0))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stat.total_activities || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {stat.total_applications || 0}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            {stat.most_used_app ? stat.most_used_app.replace('.exe', '') : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Nenhuma estatística disponível para o período selecionado
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Stats;
