import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL + "/api",
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('API request with token:', config.url, token.substring(0, 20) + '...');
    } else {
      console.warn('API request WITHOUT token:', config.url);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized - Clearing cookies and redirecting to login');
      Cookies.remove('token');
      Cookies.remove('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const auth = {
  signup: (email, password) => api.post('/api/auth/signup', { email, password }),

  login: (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },

  getMe: () => api.get('/api/auth/me'),
};

export const user = {
  getDepartmentAccess: () =>
    axios.get('/api/user/department-access')
};

export const ecochat = {
  send: (data) => api.post('/ecochat', data),
  estimate: (prompt, model, region) => api.post('/ecochat/estimate', { prompt, model, region }),
  countTokens: (prompt, llm_model, llm_provider) => api.post('/ecochat/count-tokens', { prompt, llm_model, llm_provider }),
};

export const analytics = {
  getPrompts: () => api.get('/analytics/prompts'),
  getStats: () => api.get('/analytics/stats'),
};

export const leaderboard = {
  get: () => api.get('/leaderboard'),
};

export const badges = {
  get: () => api.get('/badges'),
};

export const courses = {
  get: () => api.get('/courses'),
};

export const recommender = {
  getModels: () => api.get('/recommender/models'),
  getRegions: () => api.get('/recommender/regions'),
};

export const admin = {
  getDepartments: () => api.get('/admin/departments'),
  updateDepartment: (id, data) => api.put(`/admin/departments/${id}`, data),
  getDepartmentAnalytics: () => api.get('/admin/analytics/departments'),
  generateESGReport: () => api.post('/admin/esg-report'),
  getCustomESGReport: (department, startDate, endDate) =>
  api.get(
    `/admin/esg-report/custom?department=${department}&start_date=${startDate}&end_date=${endDate}`
  ),

};