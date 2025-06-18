// backend/src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routers e middlewares
const authRouter = require('./routes/auth');
const authenticateToken = require('./utils/authMiddleware');
const campaignsRouter = require('./routes/campaigns');
const startScheduler = require('./services/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos de uploads para preview de imagens
// Assumimos que a pasta uploads está em <project_root>/uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rotas públicas
app.use('/api/auth', authRouter);

// Rotas protegidas de campanhas
app.use('/api/campaigns', authenticateToken, campaignsRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
  if (typeof startScheduler === 'function') {
    startScheduler();
  }
});
