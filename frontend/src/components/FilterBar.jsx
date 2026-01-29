import React, { useState } from 'react';
import { Search, Filter, X, Clock } from 'lucide-react';

const FilterBar = ({ onFilterChange, showTimeFilters = true }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState({
    hostname: '',
    username: '',
    executable: '',
    date: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    businessHours: false,
    ignoreTimeFrom: '',
    ignoreTimeTo: '',
  });

  const handleChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    
    // Se ativar horário comercial, desativa o filtro de horário personalizado
    if (field === 'businessHours' && value) {
      newFilters.startTime = '';
      newFilters.endTime = '';
    }
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      hostname: '',
      username: '',
      executable: '',
      date: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      businessHours: false,
      ignoreTimeFrom: '',
      ignoreTimeTo: '',
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '' && v !== false);
  const hasTimeFilters = filters.startTime || filters.endTime || filters.businessHours || 
                          filters.ignoreTimeFrom || filters.ignoreTimeTo;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter size={20} className="text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              Ativos
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {showTimeFilters && (
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <Clock size={16} />
              {showAdvanced ? 'Ocultar' : 'Filtros de Horário'}
            </button>
          )}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
            >
              <X size={16} />
              Limpar filtros
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hostname
          </label>
          <input
            type="text"
            value={filters.hostname}
            onChange={(e) => handleChange('hostname', e.target.value)}
            placeholder="Ex: UNI-SUP26"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Usuário
          </label>
          <input
            type="text"
            value={filters.username}
            onChange={(e) => handleChange('username', e.target.value)}
            placeholder="Ex: joao.santos"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Aplicativo
          </label>
          <input
            type="text"
            value={filters.executable}
            onChange={(e) => handleChange('executable', e.target.value)}
            placeholder="Ex: chrome"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data
          </label>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filtros de Horário Avançados */}
      {showTimeFilters && showAdvanced && (
        <div className="mt-6 pt-6 border-t space-y-4">
          {/* Filtros de Data Estendidos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Horário Comercial */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <input
              type="checkbox"
              id="businessHours"
              checked={filters.businessHours}
              onChange={(e) => handleChange('businessHours', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="businessHours" className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <Clock size={16} className="text-blue-600" />
              Horário Comercial (08:00 - 18:00)
            </label>
          </div>

          {/* Filtros de Horário Personalizado */}
          {!filters.businessHours && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horário Inicial
                </label>
                <input
                  type="time"
                  value={filters.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horário Final
                </label>
                <input
                  type="time"
                  value={filters.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Ignorar Horário */}
          <div className="p-4 bg-orange-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Ignorar Horário (ex: almoço)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  De
                </label>
                <input
                  type="time"
                  value={filters.ignoreTimeFrom}
                  onChange={(e) => handleChange('ignoreTimeFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: 12:00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Até
                </label>
                <input
                  type="time"
                  value={filters.ignoreTimeTo}
                  onChange={(e) => handleChange('ignoreTimeTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ex: 14:00"
                />
              </div>
            </div>
            {filters.ignoreTimeFrom && filters.ignoreTimeTo && (
              <p className="mt-2 text-xs text-gray-600">
                ⚠️ Atividades entre {filters.ignoreTimeFrom} e {filters.ignoreTimeTo} serão ignoradas
              </p>
            )}
          </div>

          {/* Resumo dos Filtros de Horário */}
          {hasTimeFilters && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Filtros de horário ativos:</p>
              <div className="flex flex-wrap gap-2">
                {filters.businessHours && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    Horário comercial (08:00-18:00)
                  </span>
                )}
                {filters.startTime && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    Início: {filters.startTime}
                  </span>
                )}
                {filters.endTime && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    Fim: {filters.endTime}
                  </span>
                )}
                {filters.ignoreTimeFrom && filters.ignoreTimeTo && (
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                    Ignorar: {filters.ignoreTimeFrom} - {filters.ignoreTimeTo}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
