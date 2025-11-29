import axios from 'axios';
import { auth } from '../utils/firebase';

const resolveApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const lanHost =
    import.meta.env.VITE_LAN_IP ||
    (typeof window !== 'undefined' ? window.location.hostname : 'localhost');

  const port = import.meta.env.VITE_API_PORT || 3000;
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';

  return `${protocol}//${lanHost}:${port}`;
};

const API_URL = resolveApiBaseUrl();

const api = axios.create({
  baseURL: `${API_URL}/api`
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const userAPI = {
  register: (data) => api.post('/users/register', data),
  getProfile: () => api.get('/users/profile'),
  getUser: (userId) => api.get(`/users/${userId}`)
};

export const healthAPI = {
  addRecord: (data) => api.post('/health/add', data),
  getRecords: (userId) => api.get(`/health/${userId}`)
};

export const flagAPI = {
  flagCase: (userId, data) => api.post(`/flag/${userId}`, data),
  getAllFlagged: () => api.get('/flag/all')
};

export const qrAPI = {
  generate: (userId) => api.post('/qr/generate', { userId }),
  get: (userId) => api.get(`/qr/${userId}`)
};

export const notificationAPI = {
  get: (userId) => api.get(`/notifications/${userId}`),
  markRead: (notificationId) => api.put(`/notifications/${notificationId}/read`)
};

export const villagerProfileAPI = {
  getMine: () => api.get('/villager-profile/me'),
  getByUser: (userId) => api.get(`/villager-profile/${userId}`),
  saveMine: (data) => api.put('/villager-profile/me', data)
};

export default api;
