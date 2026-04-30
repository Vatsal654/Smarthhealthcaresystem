import axios from 'axios';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('shs_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== 'undefined') {
      const here = window.location.pathname;
      if (!here.startsWith('/login') && !here.startsWith('/signup') && here !== '/') {
        localStorage.removeItem('shs_token');
        localStorage.removeItem('shs_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export function apiError(err: any): string {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.message ||
    'Something went wrong'
  );
}
