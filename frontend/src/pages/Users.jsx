import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/endpoints/users.php');
      if (response.success) {
        setUsers(response.data);
      } else {
        setError(response.error || 'Erro ao carregar usuários');
      }
    } catch (err) {
      setError('Erro ao conectar com servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.post('/endpoints/users.php', formData);
      
      if (response.success) {
        setShowCreateModal(false);
        setFormData({ username: '', email: '', password: '', full_name: '', is_admin: false });
        fetchUsers();
      } else {
        alert(response.error || 'Erro ao criar usuário');
      }
    } catch (err) {
      alert('Erro ao criar usuário');
    }
  };

  const handleToggleAdmin = async (userId, isAdmin) => {
    if (!confirm(`Deseja ${isAdmin ? 'promover a' : 'remover de'} administrador?`)) {
      return;
    }

    try {
      const response = await api.put(`/endpoints/users.php/${userId}/toggle-admin`, { is_admin: isAdmin });
      
      if (response.success) {
        fetchUsers();
      } else {
        alert(response.error || 'Erro ao atualizar privilégios');
      }
    } catch (err) {
      alert('Erro ao atualizar privilégios');
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    try {
      const response = await api.put(`/endpoints/users.php/${userId}`, { is_active: isActive });
      
      if (response.success) {
        fetchUsers();
      } else {
        alert(response.error || 'Erro ao atualizar status');
      }
    } catch (err) {
      alert('Erro ao atualizar status');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('As senhas não coincidem');
      return;
    }

    if (passwordData.new_password.length < 6) {
      alert('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    try {
      const response = await api.put(`/endpoints/users.php/${selectedUser.id}/reset-password`, {
        new_password: passwordData.new_password
      });

      if (response.success) {
        setShowPasswordModal(false);
        setPasswordData({ new_password: '', confirm_password: '' });
        alert('Senha resetada com sucesso');
      } else {
        alert(response.error || 'Erro ao resetar senha');
      }
    } catch (err) {
      alert('Erro ao resetar senha');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Deseja realmente deletar o usuário ${username}?`)) {
      return;
    }

    try {
      const response = await api.delete(`/endpoints/users.php/${userId}`);
      
      if (response.success) {
        fetchUsers();
      } else {
        alert(response.error || 'Erro ao deletar usuário');
      }
    } catch (err) {
      alert('Erro ao deletar usuário');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Carregando usuários...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Criar Usuário
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome Completo</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Login</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
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
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  {user.id !== currentUser.id && (
                    <>
                      <button
                        onClick={() => handleToggleAdmin(user.id, !user.is_admin)}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        {user.is_admin ? 'Remover Admin' : 'Tornar Admin'}
                      </button>
                      <button
                        onClick={() => handleToggleActive(user.id, !user.is_active)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {user.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowPasswordModal(true);
                        }}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Resetar Senha
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Deletar
                      </button>
                    </>
                  )}
                  {user.id === currentUser.id && (
                    <span className="text-gray-400">Você</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
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
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
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
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
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
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
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
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
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

export default Users;
