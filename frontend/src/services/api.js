// frontend/src/services/api.js
import axios from 'axios';

// URL base da API (front-end Vite: define em .env local VITE_API_URL, ex: VITE_API_URL=http://localhost:3001/api)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL
});

// Interceptor para inserir token JWT
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Se o data for FormData, axios detecta e coloca o Content-Type multipart/form-data com boundary
  return config;
}, error => Promise.reject(error));

export function login(payload) {
  return api.post('/auth/login', payload);
}

export function getProfile() {
  return api.get('/auth/me');
}

/**
 * Cria campanha. Se payload for FormData, envie multipart/form-data; 
 * caso contrário, JSON puro.
 * Você pode chamar createCampaign(formData, true) ou simplesmente createCampaign(formData).
 */
export function createCampaign(payload) {
  // Se for FormData, não precisamos ajustar cabeçalho manualmente; axios detecta.
  if (payload instanceof FormData) {
    return api.post('/campaigns', payload);
  }
  // JSON puro
  return api.post('/campaigns', payload);
}

export function fetchCampaigns() {
  return api.get('/campaigns');
}

export function deleteCampaign(id) {
  return api.delete(`/campaigns/${id}`);
}

export default api;
