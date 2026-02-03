import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Users, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://pcmon.uniware.net.br:8090';

const Settings = () => {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Estados para Limpeza
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanupType, setCleanupType] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  
  // Estados para Usuários
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    is_admin: false
  });
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  // Funções de Usuários
  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await api.get('/endpoints/users.php');
      if (response.success) {
        setUsers(response.data);
      } else {
        showMessage('error', response.error || 'Erro ao carregar usuários');
      }
    } catch (err) {
      showMessage('error', 'Erro ao conectar com servidor');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/endpoints/users.php', formData);
      if (response.success) {
        setShowCreateModal(false);
        setFormData({ username: '', email: '', password: '', full_name: '', is_admin: false });
        showMessage('success', 'Usuário criado com sucesso');
        loadUsers();
      } else {
        showMessage('error', response.error || 'Erro ao criar usuário');
      }
    } catch (err) {
      showMessage('error', 'Erro ao criar usuário');
    }
  };

  const handleToggleAdmin = async (userId, isAdmin) => {
    if (!confirm(`Deseja ${isAdmin ? 'promover a' : 'remover de'} administrador?`)) {
      return;
    }
    try {
      const response = await api.put(`/endpoints/users.php/${userId}/toggle-admin`, { is_admin: isAdmin });
      if (response.success) {
        showMessage('success', 'Privilégios atualizados com sucesso');
        loadUsers();
      } else {
        showMessage('error', response.error || 'Erro ao atualizar privilégios');
      }
    } catch (err) {
      showMessage('error', 'Erro ao atualizar privilégios');
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    try {
      const response = await api.put(`/endpoints/users.php/${userId}`, { is_active: isActive });
      if (response.success) {
        showMessage('success', 'Status atualizado com sucesso');
        loadUsers();
      } else {
        showMessage('error', response.error || 'Erro ao atualizar status');
      }
    } catch (err) {
      showMessage('error', 'Erro ao atualizar status');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      showMessage('error', 'As senhas não coincidem');
      return;
    }
    if (passwordData.new_password.length < 6) {
      showMessage('error', 'Senha deve ter no mínimo 6 caracteres');
      return;
    }
    try {
      const response = await api.put(`/endpoints/users.php/${selectedUser.id}/reset-password`, {
        new_password: passwordData.new_password
      });
      if (response.success) {
        setShowPasswordModal(false);
        setPasswordData({ new_password: '', confirm_password: '' });
        setSelectedUser(null);
        showMessage('success', 'Senha resetada com sucesso');
      } else {
        showMessage('error', response.error || 'Erro ao resetar senha');
      }
    } catch (err) {
      showMessage('error', 'Erro ao resetar senha');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Deseja realmente deletar o usuário ${username}?`)) {
      return;
    }
    try {
      const response = await api.delete(`/endpoints/users.php/${userId}`);
      if (response.success) {
        showMessage('success', 'Usuário deletado com sucesso');
        loadUsers();
      } else {
        showMessage('error', response.error || 'Erro ao deletar usuário');
      }
    } catch (err) {
      showMessage('error', 'Erro ao deletar usuário');
    }
  };

  // Funções de Limpeza
  const handleCleanupRequest = (type) => {
    setCleanupType(type);
    setShowCleanupModal(true);
  };

  const executeCleanup = async () => {
    try {
      setCleanupLoading(true);
      const endpoint = cleanupType === 'all' ? '/api/cleanup/all' : '/api/cleanup/old';
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        showMessage('success', data.message || 'Limpeza executada com sucesso');
        setShowCleanupModal(false);
        setCleanupType(null);
      } else {
        showMessage('error', data.message || 'Erro ao executar limpeza');
        setShowCleanupModal(false);
      }
    } catch (error) {
      console.error('Erro ao executar limpeza:', error);
      showMessage('error', `Erro: ${error.message}`);
      setShowCleanupModal(false);
    } finally {
      setCleanupLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  return (
    <div className="w-full px-6 py-8" style={{ maxWidth: '90vw', margin: '0 auto' }}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <SettingsIcon size={32} className="text-primary-600" />
          Configurações
        </h1>
        <p className="text-gray-600 mt-2">Gerencie as configurações do sistema</p>
      </div>

      {/* Mensagem de feedback */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex gap-8 px-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users size={16} className="inline mr-2" />
              Usuários
            </button>
            <button
              onClick={() => setActiveTab('cleanup')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'cleanup'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Trash2 size={16} className="inline mr-2" />
              Limpeza
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Tab: Usuários */}
          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Gerenciamento de Usuários</h3>
                  <p className="text-sm text-gray-600 mt-1">Gerencie os usuários do sistema</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Plus size={16} />
                  Criar Usuário
                </button>
              </div>

              {usersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nenhum usuário cadastrado
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome Completo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Login</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.full_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.is_admin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {user.is_admin ? 'Admin' : 'Usuário'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : 'Nunca'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {user.id !== currentUser.id ? (
                              <div className="flex justify-end gap-3">
                                <button
                                  onClick={() => handleToggleAdmin(user.id, !user.is_admin)}
                                  className="text-purple-600 hover:text-purple-900"
                                  title={user.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                                >
                                  {user.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                                </button>
                                <button
                                  onClick={() => handleToggleActive(user.id, !user.is_active)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title={user.is_active ? 'Desativar' : 'Ativar'}
                                >
                                  {user.is_active ? 'Desativar' : 'Ativar'}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setShowPasswordModal(true);
                                  }}
                                  className="text-yellow-600 hover:text-yellow-900"
                                  title="Resetar Senha"
                                >
                                  Resetar Senha
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(user.id, user.username)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Deletar"
                                >
                                  Deletar
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400">Você</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Limpeza */}
          {activeTab === 'cleanup' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Limpeza de Dados
                </h3>
                <p className="text-sm text-gray-600">
                  Execute rotinas de limpeza para gerenciar o espaço do banco de dados.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Card: Limpar Dados Antigos */}
                <div className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-yellow-100 rounded-lg flex-shrink-0">
                      <Trash2 size={24} className="text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Limpar Dados Antigos
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        Remove registros com <strong>mais de 30 dias</strong> das seguintes tabelas:
                      </p>
                    </div>
                  </div>
                  <ul className="text-sm text-gray-600 mb-4 space-y-1 pl-6 flex-1">
                    <li>• Eventos de atividade</li>
                    <li>• Períodos de atividade</li>
                    <li>• Resumos diários</li>
                    <li>• Última atividade do mouse</li>
                    <li>• Snapshots de janelas</li>
                  </ul>
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                    <p className="text-xs text-yellow-800">
                      <strong>Atenção:</strong> Dados removidos não podem ser recuperados.
                    </p>
                  </div>
                  <button
                    onClick={() => handleCleanupRequest('old')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    <Trash2 size={16} />
                    Limpar Dados Antigos (30+ dias)
                  </button>
                </div>

                {/* Card: Limpar Todos os Dados */}
                <div className="border border-red-200 rounded-lg p-6 hover:shadow-md transition-shadow flex flex-col">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="p-3 bg-red-100 rounded-lg flex-shrink-0">
                      <AlertTriangle size={24} className="text-red-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        Limpar TODOS os Dados
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        <strong className="text-red-600">AÇÃO DESTRUTIVA:</strong> Remove <strong>TODOS</strong> os registros das seguintes tabelas:
                      </p>
                    </div>
                  </div>
                  <ul className="text-sm text-gray-600 mb-4 space-y-1 pl-6 flex-1">
                    <li>• Eventos de atividade</li>
                    <li>• Períodos de atividade</li>
                    <li>• Resumos diários</li>
                    <li>• Última atividade do mouse</li>
                    <li>• Snapshots de janelas</li>
                    <li>• Sessões de usuário</li>
                    <li>• Log de atividade de usuário</li>
                  </ul>
                  <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4">
                    <p className="text-xs text-red-800">
                      <strong>PERIGO:</strong> Esta ação apaga TODO o histórico de monitoramento e não pode ser desfeita!
                    </p>
                  </div>
                  <button
                    onClick={() => handleCleanupRequest('all')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <AlertTriangle size={16} />
                    Limpar TODOS os Dados
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Confirmação de Limpeza */}
      {showCleanupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-2xl">
            <div className={`p-6 rounded-t-lg ${
              cleanupType === 'all' ? 'bg-red-50' : 'bg-yellow-50'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${
                  cleanupType === 'all' ? 'bg-red-100' : 'bg-yellow-100'
                }`}>
                  {cleanupType === 'all' ? (
                    <AlertTriangle size={32} className="text-red-600" />
                  ) : (
                    <Trash2 size={32} className="text-yellow-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {cleanupType === 'all' ? 'Confirmar Limpeza Total' : 'Confirmar Limpeza de Dados Antigos'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Esta ação não pode ser desfeita
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {cleanupType === 'all' ? (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800 font-semibold mb-2">
                      ⚠️ ATENÇÃO: AÇÃO IRREVERSÍVEL
                    </p>
                    <p className="text-sm text-red-700">
                      Você está prestes a apagar <strong>TODO o histórico de monitoramento</strong> do sistema.
                    </p>
                  </div>
                  <p className="text-sm text-gray-700">
                    Todos os dados de atividades, períodos, snapshots e sessões serão permanentemente removidos.
                  </p>
                  <p className="text-sm text-gray-700 font-semibold">
                    Tem certeza absoluta que deseja continuar?
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 font-semibold mb-2">
                      ⚠️ Dados Antigos Serão Removidos
                    </p>
                    <p className="text-sm text-yellow-700">
                      Registros com <strong>mais de 30 dias</strong> serão permanentemente excluídos.
                    </p>
                  </div>
                  <p className="text-sm text-gray-700">
                    Esta operação ajuda a liberar espaço no banco de dados mantendo dados recentes.
                  </p>
                  <p className="text-sm text-gray-700 font-semibold">
                    Deseja prosseguir com a limpeza?
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 bg-gray-50 rounded-b-lg">
              <button
                onClick={() => setShowCleanupModal(false)}
                disabled={cleanupLoading}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={executeCleanup}
                disabled={cleanupLoading}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                  cleanupType === 'all'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {cleanupLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Limpando...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {cleanupType === 'all' ? <AlertTriangle size={16} /> : <Trash2 size={16} />}
                    Confirmar Limpeza
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Usuário */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Criar Novo Usuário</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_admin"
                  className="mr-2"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({...formData, is_admin: e.target.checked})}
                />
                <label htmlFor="is_admin" className="text-sm text-gray-700">
                  Administrador
                </label>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({ username: '', email: '', password: '', full_name: '', is_admin: false });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Resetar Senha */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Resetar Senha: {selectedUser.username}</h2>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirmar Senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                >
                  Resetar Senha
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ new_password: '', confirm_password: '' });
                    setSelectedUser(null);
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
