// frontend/src/services/api.js
import axios from 'axios';

// 1) Nome da variável de ambiente: VITE_API_BASE_URL.
//    Localmente: frontend/.env deve ter:
//      VITE_API_BASE_URL=http://localhost:3001/api
//    Em produção (Railway): VITE_API_BASE_URL=https://<seu-backend>.up.railway.app/api
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL
});

// Interceptor para inserir token JWT em todas as requisições
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

// Endpoints de autenticação
export function login(payload) {
  // payload: { email, password } conforme seu backend
  return api.post('/auth/login', payload);
}

export function getProfile() {
  return api.get('/auth/me');
}

// Endpoints de campanhas
export function createCampaign(payload) {
  // Se payload for FormData, axios define Content-Type multipart/form-data
  if (payload instanceof FormData) {
    return api.post('/campaigns', payload);
  }
  return api.post('/campaigns', payload);
}

export function fetchCampaigns() {
  return api.get('/campaigns');
}

export function deleteCampaign(id) {
  return api.delete(`/campaigns/${id}`);
}

export default api;
