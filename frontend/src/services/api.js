import axios from 'axios';
import { auth } from '../utils/firebase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

export default api;
