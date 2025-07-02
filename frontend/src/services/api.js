import axios from 'axios';

// Detecta se estamos em localhost (dev)
const isLocalhost =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

// Prioriza sempre VITE_API_BASE_URL, se não definido:
//  • em localhost → http://localhost:3001/api
//  • em outros hosts → '/api' (útil para proxy)
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL
    ?? (isLocalhost
        ? 'http://localhost:3001/api'
        : '/api');

// DEBUG: mostrar no console qual URL está sendo usada
console.log('📡 API_BASE_URL =', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL
});

// Interceptor para injetar o token JWT
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
