import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;

// ─── API helpers ──────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  me: () => api.get('/api/auth/me'),
};

export const customersApi = {
  list: (params?: Record<string, string>) =>
    api.get('/api/customers', { params }),
  getById: (id: string) => api.get(`/api/customers/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/api/customers/${id}`, data),
  remove: (id: string) => api.delete(`/api/customers/${id}`),
  getMessages: (id: string, page = 1) =>
    api.get(`/api/customers/${id}/messages`, { params: { page } }),
  addTag: (id: string, tagId: string) =>
    api.post(`/api/customers/${id}/tags`, { tagId }),
  removeTag: (id: string, tagId: string) =>
    api.delete(`/api/customers/${id}/tags/${tagId}`),
  takeover: (id: string) => api.post(`/api/customers/${id}/takeover`),
  release: (id: string) => api.post(`/api/customers/${id}/release`),
  reply: (id: string, message: string) =>
    api.post(`/api/customers/${id}/reply`, { message }),
};

export const tagsApi = {
  list: () => api.get('/api/tags'),
  create: (name: string, color?: string) =>
    api.post('/api/tags', { name, color }),
  remove: (id: string) => api.delete(`/api/tags/${id}`),
};

export const notificationsApi = {
  list: (unread?: boolean) =>
    api.get('/api/notifications', { params: unread ? { unread: 'true' } : {} }),
  markRead: (id: string) => api.patch(`/api/notifications/${id}/read`),
  unreadCount: () => api.get('/api/notifications/unread-count'),
};

export const broadcastsApi = {
  list: (page = 1) => api.get('/api/broadcasts', { params: { page } }),
  create: (data: { title: string; content: string; targetTagId?: string }) =>
    api.post('/api/broadcasts', data),
};

export const dashboardApi = {
  summary: () => api.get('/api/dashboard/summary'),
};
