console.log('### index.js foi carregado ###');
console.log('Variáveis: PORT=', process.env.PORT, ' FRONTEND_URL=', process.env.FRONTEND_URL);

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Variáveis de ambiente
const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({
  origin: FRONTEND_URL,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));
app.options('*', cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// Rotas da API
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

// Fallback via regex para Express 5
app.all(/.*/, (req, res) => {
  res.status(404).json({ message: `Rota ${req.originalUrl} não existe.` });
});

app.listen(PORT, HOST, () => {
  console.log(`Backend rodando na porta ${PORT} (host ${HOST})`);
  try {
    const startScheduler = require('./services/scheduler');
    startScheduler();
  } catch (err) {
    console.error('Erro ao iniciar scheduler:', err);
  }
});
