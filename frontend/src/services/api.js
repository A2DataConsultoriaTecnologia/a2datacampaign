import axios from 'axios';

// Detecta se estamos em localhost (dev) ou em outro host (staging/prod)
const isLocalhost = window.location.hostname === 'localhost' 
  || window.location.hostname === '127.0.0.1';

// Prioriza a variável local em dev, caso exista; senão, usa o BASE_URL do Railway
const API_BASE_URL = isLocalhost
  ? (import.meta.env.VITE_API_LOCAL_URL ?? 'http://localhost:3001/api')
  : (import.meta.env.VITE_API_BASE_URL ?? '/api');

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  err => Promise.reject(err)
);

export function login(payload) {
  return api.post('/auth/login', payload);
}

export function getProfile() {
  return api.get('/auth/me');
}

export function createCampaign(payload) {
  return api.post('/campaigns', payload);
}

export function fetchCampaigns() {
  return api.get('/campaigns');
}

export function deleteCampaign(id) {
  return api.delete(`/campaigns/${id}`);
}

export default api;
