require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Variáveis de ambiente
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
// Defina FRONTEND_URL no Railway (ex: https://seu-frontend.up.railway.app)
// Em dev local, pode ser http://localhost:5173
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS: ajustar origin conforme necessário
app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));
app.options('*', cors()); // preflight

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir uploads, se usar
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check (antes do fallback)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

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

// Fallback para rotas não definidas: usar regex em vez de '*'
app.all(/.*/, (req, res) => {
  res.status(404).json({ message: `Rota ${req.originalUrl} não existe.` });
});

// Iniciar servidor escutando em host 0.0.0.0 e porta correta
app.listen(PORT, HOST, () => {
  console.log(`Backend rodando na porta ${PORT} (host ${HOST})`);
  // Iniciar scheduler, se aplicável
  try {
    const startScheduler = require('./services/scheduler');
    startScheduler();
  } catch (err) {
    console.error('Erro ao iniciar scheduler:', err);
  }
});
