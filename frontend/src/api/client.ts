import axios from 'axios';

export function resolveApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!envUrl) {
    return '/api';
  }
  const clean = envUrl.replace(/\/+$/, '');
  if (!clean.endsWith('/api')) {
    return `${clean}/api`;
  }
  return clean;
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('swasthya_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized and not already on login/register, clear token
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('swasthya_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
