// backend/src/index.js
require('dotenv').config();

console.log('### index.js foi carregado ###');
console.log(
  'Variáveis: PORT=', process.env.PORT,
  ' FRONTEND_URL=', process.env.FRONTEND_URL,
  ' RUN_SCHEDULER=', process.env.RUN_SCHEDULER
);

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Configurar CORS
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir uploads de imagens
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rotas públicas e protegidas
try {
  console.log('Registrando /api/auth');
  const authRouter = require('./routes/auth');
  app.use('/api/auth', authRouter);
  console.log('  OK /api/auth');
} catch (e) {
  console.error('Erro ao registrar /api/auth:', e);
}

try {
  console.log('Registrando /api/feedback');
  const feedbackRouter = require('./routes/feedback');
  app.use('/api/feedback', feedbackRouter);
  console.log('  OK /api/feedback');
} catch (e) {
  console.error('Erro ao registrar /api/feedback:', e);
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
const PORT = parseInt(process.env.PORT, 10) || 3001;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Backend rodando na porta ${PORT} (host ${HOST})`);
  console.log(`CORS habilitado para: ${allowedOrigin}`);

  if (process.env.RUN_SCHEDULER === 'true') {
    try {
      const startScheduler = require('./services/scheduler');
      startScheduler();
      console.log('✅ Scheduler iniciado nesta instância.');
    } catch (err) {
      console.error('❌ Erro ao iniciar scheduler:', err);
    }
  } else {
    console.log('ℹ️ Scheduler desativado nesta instância.');
  }
});
