import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.setAuthToken(token);
      checkAuth();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth.php/me');
      if (response.success) {
        setUser(response.data);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth.php/login', { username, password });
      
      if (response.success) {
        const { token: newToken, user: userData } = response.data;
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        api.setAuthToken(newToken);
        return { success: true };
      }
      
      return { success: false, error: response.error || 'Erro ao fazer login' };
    } catch (error) {
      return { success: false, error: error.message || 'Erro ao conectar com servidor' };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth.php/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
      api.setAuthToken(null);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await api.post('/auth.php/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    changePassword,
    isAdmin: user?.is_admin || false,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
