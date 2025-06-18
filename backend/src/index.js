require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Variáveis de ambiente
const PORT = process.env.PORT || 3001;
// Deve ser exatamente a URL do frontend (sem barra final), ex: https://meu-frontend.up.railway.app
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Middleware CORS: permite apenas FRONTEND_URL
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));
// Habilitar preflight para todas as rotas
app.options('*', cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir uploads (se usar)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rotas da API
try {
  const authRouter = require('./routes/auth');
  app.use('/api/auth', authRouter);
} catch (e) {
  console.error('Erro ao registrar /api/auth:', e);
}
try {
  const authenticateToken = require('./utils/authMiddleware');
  const campaignsRouter = require('./routes/campaigns');
  app.use('/api/campaigns', authenticateToken, campaignsRouter);
} catch (e) {
  console.error('Erro ao registrar /api/campaigns:', e);
}

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Rota fallback (Express 5 requer coringa nomeado)
app.all('/*splat', (req, res) => {
  res.status(404).json({ message: `Rota ${req.originalUrl} não existe.` });
});

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
  // Iniciar scheduler se desejar
  try {
    const startScheduler = require('./services/scheduler');
    startScheduler();
  } catch (err) {
    console.error('Erro ao iniciar scheduler:', err);
  }
});
