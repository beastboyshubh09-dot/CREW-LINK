import axios from 'axios';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crewlink_access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshRequest;
api.interceptors.response.use((response) => response, async (error) => {
  const request = error.config;
  if (error.response?.status !== 401 || !request || request._retry || request.url?.includes('/auth/token/refresh/')) {
    return Promise.reject(error);
  }
  const refresh = localStorage.getItem('crewlink_refresh');
  if (!refresh) return Promise.reject(error);
  request._retry = true;
  try {
    refreshRequest ||= axios.post(`${api.defaults.baseURL}/auth/token/refresh/`, { refresh });
    const { data } = await refreshRequest;
    refreshRequest = null;
    localStorage.setItem('crewlink_access', data.access);
    request.headers.Authorization = `Bearer ${data.access}`;
    return api(request);
  } catch (refreshError) {
    refreshRequest = null;
    ['crewlink_user', 'crewlink_access', 'crewlink_refresh'].forEach((key) => localStorage.removeItem(key));
    window.dispatchEvent(new Event('crewlink:session-expired'));
    return Promise.reject(refreshError);
  }
});

export const wait = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));