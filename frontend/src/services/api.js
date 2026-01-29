import axios from 'axios';

// Detectar se está rodando em container ou localmente
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://10.1.0.172:8090/api'
  : 'http://10.1.0.172:8090/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Window Activities
export const windowActivityService = {
  getAll: async (params = {}) => {
    const response = await api.get('/window-activities', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/window-activities/${id}`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/window-activity', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.put(`/window-activity/${id}`, data);
    return response.data;
  },
};

// Computers
export const computerService = {
  getAll: async (params = {}) => {
    const response = await api.get('/computers', { params });
    return response.data;
  },
  
  register: async (data) => {
    const response = await api.post('/computer/register', data);
    return response.data;
  },
  
  getCurrentActivity: async (hostname, username) => {
    const response = await api.get(`/computers/${encodeURIComponent(hostname)}/${encodeURIComponent(username)}/current-activity`);
    return response.data;
  },
  
  getRecentActivities: async (hostname, username, minutes = 30) => {
    const response = await api.get(`/computers/${encodeURIComponent(hostname)}/${encodeURIComponent(username)}/recent-activities`, {
      params: { minutes }
    });
    return response.data;
  },
  
  getWindowsSnapshot: async (hostname, username) => {
    const response = await api.get(`/computers/${encodeURIComponent(hostname)}/${encodeURIComponent(username)}/windows-snapshot`);
    return response.data;
  },
  
  getActivityStatus: async (hostname, username) => {
    const response = await api.get(`/computers/${encodeURIComponent(hostname)}/${encodeURIComponent(username)}/activity-status`);
    return response.data;
  },
  
  getAllActivityStatus: async () => {
    const response = await api.get('/computers/activity-status');
    return response.data;
  },
};

// Stats
export const statsService = {
  getDaily: async (params = {}) => {
    const response = await api.get('/stats/daily', { params });
    return response.data;
  },
};

// User Analytics
export const userService = {
  getAll: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  
  getStats: async (username, params = {}) => {
    const response = await api.get(`/users/${encodeURIComponent(username)}/stats`, { params });
    return response.data;
  },
  
  getApplications: async (username, params = {}) => {
    const response = await api.get(`/users/${encodeURIComponent(username)}/applications`, { params });
    return response.data;
  },
  
  getApplicationActivities: async (username, executable, params = {}) => {
    const response = await api.get(`/users/${encodeURIComponent(username)}/applications/${encodeURIComponent(executable)}/activities`, { params });
    return response.data;
  },
  
  compare: async (params = {}) => {
    const response = await api.get('/users/compare', { params });
    return response.data;
  },
};

// Health
export const healthService = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;
