/* frontend/src/services/api.js */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({ baseURL: API_BASE_URL });

// Adicionar token de autorização em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export function login(payload) {
  return api.post('/auth/login', payload);
}

export function getProfile() {
  return api.get('/auth/me');
}

export function createCampaign(payload) {
  if (payload instanceof FormData) {
    // Para FormData, não forçamos Content-Type; o Axios adiciona multipart/form-data + boundary automaticamente
    return api.post('/campaigns', payload);
  }
  // Para JSON, deixamos o Axios definir application/json
  return api.post('/campaigns', payload);
}

export function fetchCampaigns() {
  return api.get('/campaigns');
}

export function deleteCampaign(id) {
  return api.delete(`/campaigns/${id}`);
}

export default api;


/* backend/src/utils/fileUpload.js */
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Diretório de uploads: <project_root>/uploads
const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Configuração de storage: grava em disco em `uploads/`, nome único
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${file.fieldname}-${timestamp}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safeName);
  }
});

// Filtro de tipo de arquivo: permitir apenas imagens
function fileFilter(req, file, cb) {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Tipo de arquivo não permitido. Apenas JPEG, PNG ou WebP.'), false);
}

// Limites de tamanho
const limits = { fileSize: 5 * 1024 * 1024 }; // 5MB

// Exportar instância de multer
// Na rota, utilize `upload.array('images')` para vários arquivos ou `upload.single('image')` para um
const upload = multer({ storage, fileFilter, limits });

module.exports = upload;
