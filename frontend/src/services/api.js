// frontend/src/services/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

export function login(payload) {
  return api.post('/auth/login', payload);
}

export function getProfile() {
  return api.get('/auth/me');
}

export function createCampaign(payload) {
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
