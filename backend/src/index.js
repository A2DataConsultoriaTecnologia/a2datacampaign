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

// CORS: permitir apenas o frontend configurado em env
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // responder preflight para todas rotas

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir uploads se necessário (cuidado: efêmero em produção)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rotas da API: usar paths relativos
app.use('/api/auth', authRouter);
app.use('/api/campaigns', authenticateToken, campaignsRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
  startScheduler();
});
