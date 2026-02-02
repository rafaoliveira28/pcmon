import axios from 'axios';

// Detectar se está rodando em container ou localmente
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://pcmon.uniware.net.br:8090'
  : 'http://pcmon.uniware.net.br:8090';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
let authToken = null;

api.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      authToken = null;
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper functions
const apiHelper = {
  get: async (url, config = {}) => {
    const response = await api.get(url, config);
    return response.data;
  },
  
  post: async (url, data = {}, config = {}) => {
    const response = await api.post(url, data, config);
    return response.data;
  },
  
  put: async (url, data = {}, config = {}) => {
    const response = await api.put(url, data, config);
    return response.data;
  },
  
  delete: async (url, config = {}) => {
    const response = await api.delete(url, config);
    return response.data;
  },
  
  setAuthToken: (token) => {
    authToken = token;
  }
};

// Window Activities
export const windowActivityService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/window-activities', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/api/window-activities/${id}`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/api/window-activity', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/api/window-activity/${id}`, data);
    return response.data;
  },
};

// Computers
export const computerService = {
  getAll: async (params = {}) => {
    const response = await api.get('/api/computers', { params });
    return response.data;
  },
  
  register: async (data) => {
    const response = await api.post('/api/computer/register', data);
    return response.data;
  },
  
  getCurrentActivity: async (hostname, username) => {
    const response = await api.get(`/api/computers/${encodeURIComponent(hostname)}/${encodeURIComponent(username)}/current-activity`);
    return response.data;
  },
  
  getRecentActivities: async (hostname, username, minutes = 30) => {
    const response = await api.get(`/api/computers/${encodeURIComponent(hostname)}/${encodeURIComponent(username)}/recent-activities`, {
      params: { minutes }
    });
    return response.data;
  },
  
  getWindowsSnapshot: async (hostname, username) => {
    const response = await api.get(`/api/computers/${encodeURIComponent(hostname)}/${encodeURIComponent(username)}/windows-snapshot`);
    return response.data;
  },
  
  getActivityStatus: async (hostname, username) => {
    const response = await api.get(`/api/computers/${encodeURIComponent(hostname)}/${encodeURIComponent(username)}/activity-status`);
    return response.data;
  },
  
  getAllActivityStatus: async () => {
    const response = await api.get('/api/computers/activity-status');
    return response.data;
  },
};

// Stats
export const statsService = {
  getDaily: async (params = {}) => {
    const response = await api.get('/api/stats/daily', { params });
    return response.data;
  },
};

// User Analytics
export const userService = {
  getAll: async () => {
    const response = await api.get('/api/users');
    return response.data;
  },
  
  getStats: async (username, params = {}) => {
    const response = await api.get(`/api/users/${encodeURIComponent(username)}/stats`, { params });
    return response.data;
  },
  
  getApplications: async (username, params = {}) => {
    const response = await api.get(`/api/users/${encodeURIComponent(username)}/applications`, { params });
    return response.data;
  },
  
  getApplicationActivities: async (username, executable, params = {}) => {
    const response = await api.get(`/api/users/${encodeURIComponent(username)}/applications/${encodeURIComponent(executable)}/activities`, { params });
    return response.data;
  },
  
  compare: async (params = {}) => {
    const response = await api.get('/api/users/compare', { params });
    return response.data;
  },
};

// Health
export const healthService = {
  check: async () => {
    const response = await api.get('/api/health');
    return response.data;
  },
};

export default apiHelper;
