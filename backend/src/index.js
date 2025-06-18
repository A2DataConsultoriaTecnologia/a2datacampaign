require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRouter = require('./routes/auth');
const authenticateToken = require('./utils/authMiddleware');
const campaignsRouter = require('./routes/campaigns');
const startScheduler = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar CORS:
// - Em produção, FRONTEND_URL será algo como 'https://frontend-xyz.up.railway.app'.
// - Em local, usar fallback 'http://localhost:5173'.
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  credentials: true
};
app.use(cors(corsOptions));

app.use(express.json());

// Servir uploads (se usar):
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rotas públicas e protegidas:
app.use('/api/auth', authRouter);
app.use('/api/campaigns', authenticateToken, campaignsRouter);

// Health check:
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
  if (typeof startScheduler === 'function') {
    startScheduler();
  }
});
