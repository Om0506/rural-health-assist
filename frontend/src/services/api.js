import axios from 'axios';
import { auth } from '../utils/firebase';

const resolveApiBaseUrl = () => {
  const windowHost =
    typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const port = import.meta.env.VITE_API_PORT || 3000;

  // Production / deployed builds: always use configured API URL.
  if (import.meta.env.VITE_LOCK_API_URL === 'true' && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (import.meta.env.VITE_API_URL && import.meta.env.PROD) {
    return import.meta.env.VITE_API_URL;
  }

  // Prefer dynamic host (same machine/LAN host currently serving frontend).
  // This avoids stale hardcoded LAN IPs breaking profile/village calls.
  if (windowHost && !import.meta.env.PROD) {
    return `${protocol}//${windowHost}:${port}`;
  }

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const lanHost = import.meta.env.VITE_LAN_IP || 'localhost';
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
  getUser: (userId) => api.get(`/users/${userId}`),
  getVillageUsers: (villageId) => api.get(`/users/village/${villageId}/list`)
};

export const healthAPI = {
  addRecord: (data) => api.post('/health/add', data),
  getRecords: (userId) => api.get(`/health/${userId}`),
  updateRecord: (recordId, data) => api.put(`/health/${recordId}`, data),
  deleteRecord: (recordId) => api.delete(`/health/${recordId}`),
};

export const flagAPI = {
  flagCase: (userId, data) => api.post(`/flag/${userId}`, data),
  createFlag: (data) => api.post('/flag', data),
  getVillageFlagged: (villageId) => api.get(`/flag/village/${villageId}`),
  getAllFlagged: () => api.get('/flag/all'),
  getAiFlagged: () => api.get('/flag/ai-flagged'),
  updateCaseNotes: (caseId, data) => api.put(`/flag/${caseId}/notes`, data),
  escalateToDoctor: (caseId, data) => api.post(`/flag/${caseId}/escalate-doctor`, data),
};

export const qrAPI = {
  generate: (userId) => api.post('/qr/generate', { userId }),
  get: (userId) => api.get(`/qr/${userId}`),
  resolveScan: (qrData) => api.post('/qr/resolve', { qrData })
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

export const chatbotAPI = {
  sendMessage: (data) => api.post('/chatbot/message', data),
  getHistory: (userId) => api.get(`/chatbot/history/${userId}`),
  getSessions: (userId) => api.get(`/chatbot/sessions/${userId}`),
  getSession: (userId, sessionId) => api.get(`/chatbot/sessions/${userId}/${sessionId}`),
  createSession: (data) => api.post('/chatbot/sessions', data),
  deleteSession: (userId, sessionId) => api.delete(`/chatbot/sessions/${userId}/${sessionId}`),
  submitEscalationConsent: (data) => api.post('/chatbot/escalation-consent', data),
  resetState: (userId) => api.post('/chatbot/reset', { userId }),
};

export const villageAPI = {
  getAll: () => api.get('/villages'),
  getAssigned: () => api.get('/villages/assigned/me'),
  getRecords: (villageId) => api.get(`/villages/${villageId}/records`)
};

export const medicineAPI = {
  log: (data) => api.post('/medicine/log', data),
  getPatientLogs: (patientId) => api.get(`/medicine/patient/${patientId}`),
  updateLog: (logId, data) => api.put(`/medicine/${logId}`, data),
  deleteLog: (logId) => api.delete(`/medicine/${logId}`),
};

export const visitsAPI = {
  add: (data) => api.post('/visits/add', data),
  getByAsha: (workerId) => api.get(`/visits/asha/${workerId}`)
};

export const doctorAPI = {
  getOverview: () => api.get('/doctor/overview'),
  getFlaggedCases: () => api.get('/doctor/flagged-cases'),
  getEscalatedCases: () => api.get('/doctor/escalated-cases'),
  getInsights: () => api.get('/doctor/insights'),
  resolveFlaggedCase: (flagId, data) => api.put(`/doctor/flagged-cases/${flagId}/resolve`, data),
  saveCaseNotes: (flagId, data) => api.put(`/doctor/flagged-cases/${flagId}/notes`, data),
  requestAshaFollowUp: (flagId, data) => api.post(`/doctor/flagged-cases/${flagId}/request-asha`, data),
  searchPatients: (params) => api.get('/doctor/patients', { params }),
  getPatientDetails: (patientId) => api.get(`/doctor/patient/${patientId}`),
  addConsultation: (data) => api.post('/doctor/consultation', data),
  addPrescription: (data) => api.post('/doctor/prescriptions', data),
  getPrescriptions: (patientId) => api.get(`/doctor/prescriptions/${patientId}`),
  getVillageAnalytics: () => api.get('/doctor/analytics/villages'),
  getHighRiskPatients: () => api.get('/doctor/high-risk')
};

export const historyAPI = {
  getPatientBundle: (userId) => api.get(`/history/${userId}`),
};

export const documentAPI = {
  listByPatient: (userId) => api.get(`/documents/patient/${userId}`),
  uploadForPatient: (userId, formData) =>
    api.post(`/documents/patient/${userId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  download: (docId) => api.get(`/documents/${docId}/download`, { responseType: 'blob' }),
};

export const caseAPI = {
  getPatientCases: (userId) => api.get(`/cases/patient/${userId}`),
  getTimeline: (caseId) => api.get(`/cases/${caseId}/timeline`),
};

export default api;
