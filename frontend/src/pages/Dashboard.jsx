import React, { useState, useEffect } from 'react';
import { Monitor, Activity, Clock, Users } from 'lucide-react';
import StatCard from '../components/StatCard';
import ActivityTable from '../components/ActivityTable';
import ActivityChart from '../components/ActivityChart';
import { windowActivityService, computerService } from '../services/api';

const Dashboard = () => {
  const [activities, setActivities] = useState([]);
  const [computers, setComputers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActivities: 0,
    totalComputers: 0,
    activeComputers: 0,
    totalTime: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Carregar últimas atividades
      const activitiesResponse = await windowActivityService.getAll({ 
        limit: 10,
        page: 1 
      });
      
      // Carregar computadores
      const computersResponse = await computerService.getAll();
      
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
      
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Preparar dados para o gráfico
  const chartData = activities.slice(0, 5).map(activity => ({
    name: activity.executable.substring(0, 15),
    value: parseFloat(activity.duration_second) || 0,
  }));

  return (
    <div>
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
          title="Usuários Únicos"
          value={new Set(activities.map(a => a.username)).size}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Aplicativos"
          value={new Set(activities.map(a => a.executable)).size}
          subtitle="Únicos"
          icon={Clock}
          color="orange"
        />
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Tempo de Uso por Aplicativo (Últimas 5 atividades)
        </h2>
        <ActivityChart data={chartData} type="bar" />
      </div>

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
