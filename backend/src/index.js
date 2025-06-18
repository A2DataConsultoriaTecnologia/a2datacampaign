require('dotenv').config();

console.log('### index.js foi carregado ###');
console.log('Variáveis: PORT=', process.env.PORT, ' FRONTEND_URL=', process.env.FRONTEND_URL);

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Configurar variáveis de ambiente
const PORT = parseInt(process.env.PORT, 10) || 3001;
const HOST = '0.0.0.0';
// Somente para CORS: URL do frontend (não usar como rota no Express)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS: permitir apenas requisições do seu frontend
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));


// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir uploads de imagens
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'UP' }));

// Rotas da API (sem usar FRONTEND_URL como prefixo)
try {
  console.log('Registrando /api/auth');
  const authRouter = require('./routes/auth');
  app.use('/api/auth', authRouter);
  console.log('  OK /api/auth');
} catch (e) {
  console.error('Erro ao registrar /api/auth:', e);
}

try {
  console.log('Registrando /api/campaigns');
  const authenticateToken = require('./utils/authMiddleware');
  const campaignsRouter = require('./routes/campaigns');
  app.use('/api/campaigns', authenticateToken, campaignsRouter);
  console.log('  OK /api/campaigns');
} catch (e) {
  console.error('Erro ao registrar /api/campaigns:', e);
}

// Fallback para rotas não encontradas
app.all(/.*/, (req, res) => {
  res.status(404).json({ message: `Rota ${req.originalUrl} não existe.` });
});

// Iniciar servidor e scheduler
app.listen(PORT, HOST, () => {
  console.log(`Backend rodando na porta ${PORT} (host ${HOST})`);
  try {
    const startScheduler = require('./services/scheduler');
    startScheduler();
  } catch (err) {
    console.error('Erro ao iniciar scheduler:', err);
  }
});
