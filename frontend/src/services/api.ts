import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data: { username: string; password: string; email: string; name: string; affiliation?: string }) =>
    api.post('/auth/register', data),

  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),

  checkStatus: () =>
    api.get('/auth/status'),

  updateProfile: (data: { new_password?: string; new_affiliation?: string; new_email?: string }) =>
    api.put('/auth/profile', data),
};

// Monitoring API
export const monitoringAPI = {
  getLatestFeed: (detectorId?: string) =>
    api.get('/feed/latest', { params: { detector_id: detectorId } }),

  getStatsSummary: (duration?: 'today' | 'week' | 'month') =>
    api.get('/stats/summary', { params: { duration } }),

  getDefectDetail: (logId: string) =>
    api.get(`/log/defect/${logId}`),

  submitFeedback: (logId: string, feedbackType: string) =>
    api.post(`/log/feedback/${logId}`, { feedback_type: feedbackType }),

  getHistory: (params?: {
    detector_id?: string;
    start_date?: string;
    end_date?: string;
    verdict?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get('/logs/history', { params }),
};

// Admin API
export const adminAPI = {
  getPendingUsers: () =>
    api.get('/admin/users/pending'),

  approveUser: (userId: number) =>
    api.post('/admin/users/approve', { user_id: userId }),

  rejectUser: (userId: number) =>
    api.post('/admin/users/reject', { user_id: userId }),

  deleteUser: (userId: number) =>
    api.post('/admin/users/reject', { user_id: userId }),

  changeUserRole: (userId: number, newRole: 'user' | 'admin') =>
    api.put('/admin/users/role', { user_id: userId, new_role: newRole }),

  getReports: (params: { start_date?: string; end_date?: string; detector_id?: string }) =>
    api.get('/admin/reports', { params }),

  getAllUsers: () =>
    api.get('/admin/users'),
};

export default api;
