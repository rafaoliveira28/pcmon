import React, { useState, useEffect } from 'react';
import { Monitor, Activity, Clock, Users, User, Zap } from 'lucide-react';
import StatCard from '../components/StatCard';
import ActivityTable from '../components/ActivityTable';
import ActivityChart from '../components/ActivityChart';
import { windowActivityService, computerService, userService } from '../services/api';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const [activities, setActivities] = useState([]);
  const [computers, setComputers] = useState([]);
  const [activityStatus, setActivityStatus] = useState([]);
  const [userInactivityData, setUserInactivityData] = useState([]);
  const [topAppsData, setTopAppsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActivities: 0,
    totalComputers: 0,
    activeComputers: 0,
    activeUsers: 0,
    activeApps: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carregar últimas atividades (para contagem de apps ativos)
      const activitiesResponse = await windowActivityService.getAll({ 
        limit: 50,
        page: 1 
      });
      
      // Carregar computadores
      const computersResponse = await computerService.getAll();
      
      // Carregar status de atividade em tempo real
      const statusResponse = await computerService.getAllActivityStatus().catch(() => ({ success: false, data: [] }));
      
      // Carregar usuários
      const usersResponse = await userService.getAll().catch(() => ({ success: false, data: [] }));
      
      if (activitiesResponse.success) {
        setActivities(activitiesResponse.data);
        setStats(prev => ({
          ...prev,
          totalActivities: activitiesResponse.pagination?.total || 0,
        }));
      }
      
      if (computersResponse.success) {
        setComputers(computersResponse.data);
        const activeCount = computersResponse.data.filter(c => c.status === 'active').length;
        setStats(prev => ({
          ...prev,
          totalComputers: computersResponse.data.length,
          activeComputers: activeCount,
        }));
      }
      
      if (statusResponse.success && activitiesResponse.success) {
        setActivityStatus(statusResponse.data);
        // Contar usuários ativos (status = active)
        const activeUsers = new Set(
          statusResponse.data
            .filter(s => s.status === 'active')
            .map(s => s.username)
        ).size;
        
        // Contar aplicativos únicos em uso agora (das últimas atividades de usuários ativos)
        const activeUsersList = statusResponse.data
          .filter(s => s.status === 'active')
          .map(s => s.username);
        
        const activeApps = new Set(
          activitiesResponse.data
            .filter(a => activeUsersList.includes(a.username))
            .map(a => a.executable)
        ).size;
        
        setStats(prev => ({
          ...prev,
          activeUsers,
          activeApps,
        }));
      }
      
      // Carregar dados de períodos de inatividade
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://pcmon.uniware.net.br:8090';
        
        // Buscar períodos INATIVOS
        const inactivityResponse = await axios.get(`${API_BASE_URL}/api/activity-periods`, {
          params: {
            period_type: 'inactive',
          }
        });
        
        if (inactivityResponse.data.success) {
          // Agregar tempo de inatividade por usuário
          const inactivityByUser = {};
          inactivityResponse.data.data.forEach(period => {
            const key = period.username;
            if (!inactivityByUser[key]) {
              inactivityByUser[key] = 0;
            }
            inactivityByUser[key] += parseInt(period.duration_seconds) || 0;
          });
          
          // Top 5 usuários com mais tempo inativo
          const topInactive = Object.entries(inactivityByUser)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([username, seconds]) => ({
              name: username,
              hours: parseFloat((seconds / 3600).toFixed(2)),
            }));
          
          setUserInactivityData(topInactive);
        }
        
        // Buscar Top 5 aplicativos por tempo de uso
        const topAppsResponse = await axios.get(`${API_BASE_URL}/api/top-applications`, {
          params: {
            limit: 5
          }
        });
        
        if (topAppsResponse.data.success) {
          const topApps = topAppsResponse.data.data.map(app => ({
            name: app.executable.replace('.exe', '').substring(0, 15),
            value: parseFloat((parseInt(app.total_seconds) / 3600).toFixed(2)), // Converter para horas
            seconds: parseInt(app.total_seconds)
          }));
          
          setTopAppsData(topApps);
        }
      } catch (error) {
        console.error('Erro ao carregar dados de atividade/inatividade:', error);
      }
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Dados do gráfico já vêm prontos do backend
  const chartData = topAppsData;

  return (
    <div className="w-full px-6 py-8" style={{ maxWidth: '90vw', margin: '0 auto' }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Visão geral do monitoramento de computadores</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total de Atividades"
          value={stats.totalActivities}
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Computadores"
          value={stats.totalComputers}
          subtitle={`${stats.activeComputers} ativos`}
          icon={Monitor}
          color="green"
        />
        <StatCard
          title="Usuários Ativos"
          value={stats.activeUsers}
          subtitle="Em tempo real"
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Aplicativos Ativos"
          value={stats.activeApps}
          subtitle="Em uso agora"
          icon={Zap}
          color="orange"
        />
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Top 5 Aplicativos por Tempo de Uso (horas)
        </h2>
        <ActivityChart data={chartData} type="bar" />
      </div>

      {/* Grafico de Tempo de Inatividade dos Usuarios */}
      {userInactivityData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Top 5 Usuarios por Tempo de Inatividade (horas)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userInactivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis label={{ value: 'Horas', angle: -90, position: 'insideLeft' }} />
              <Tooltip 
                formatter={(value) => [`${value}h`, 'Tempo Inativo']}
                labelStyle={{ color: '#374151' }}
              />
              <Bar dataKey="hours" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela de Atividades Recentes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Atividades Recentes
        </h2>
        <ActivityTable activities={activities} loading={loading} />
      </div>
    </div>
  );
};

export default Dashboard;
