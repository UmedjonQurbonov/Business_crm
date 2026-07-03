import axios from 'axios';

const api = axios.create({
  baseURL: '', // Will use Next.js config rewrites to proxy to Django
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach DRF Token
if (typeof window !== 'undefined') {
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('crm_token');
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
}

export default api;
