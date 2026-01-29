import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import FilterBar from '../components/FilterBar';
import ActivityTable from '../components/ActivityTable';
import Pagination from '../components/Pagination';
import { windowActivityService } from '../services/api';
import axios from 'axios';

const API_URL = 'http://localhost:8090/api';

const Activities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({});
  const [statistics, setStatistics] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 1,
  });

  useEffect(() => {
    loadActivities();
    loadStatistics();
  }, [pagination.page, filters]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...filters,
      };
      
      // Remover filtros vazios
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });
      
      const response = await windowActivityService.getAll(params);
      
      if (response.success) {
        setActivities(response.data);
        setPagination(prev => ({
          ...prev,
          total: response.pagination.total,
          total_pages: response.pagination.total_pages,
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadStatistics = async () => {
    try {
      const params = { ...filters };
      
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

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset para página 1
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };
  
  const formatDuration = (seconds) => {
    if (!seconds) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="w-full px-6 py-8" style={{ maxWidth: '90vw', margin: '0 auto' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Atividades</h1>
          <p className="text-gray-600 mt-2">
            Visualize todas as atividades monitoradas
          </p>
        </div>
        <button
          onClick={() => {
            loadActivities();
            loadStatistics();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      <FilterBar onFilterChange={handleFilterChange} />

      {/* Cartões de Estatísticas */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Tempo Ativo</p>
                <h3 className="text-3xl font-bold mt-2">{formatDuration(statistics.active_seconds)}</h3>
                <p className="text-green-100 text-sm mt-1">{statistics.active_periods} períodos</p>
              </div>
              <CheckCircle size={48} className="opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Tempo Inativo</p>
                <h3 className="text-3xl font-bold mt-2">{formatDuration(statistics.inactive_seconds)}</h3>
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
                <p className="text-blue-100 text-sm mt-1">Total: {formatDuration(statistics.total_seconds)}</p>
              </div>
              <Clock size={48} className="opacity-80" />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Lista de Atividades
          </h2>
          <span className="text-sm text-gray-600">
            {pagination.total} atividades encontradas
          </span>
        </div>
        
        <ActivityTable activities={activities} loading={loading} />
        
        {pagination.total_pages > 1 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.total_pages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
};

export default Activities;
