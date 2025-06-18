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

// Logar valor de FRONTEND_URL para garantir que não está incorreto
console.log('FRONTEND_URL=', process.env.FRONTEND_URL);

// CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Envolver app.use em try/catch para identificar falha
try {
  console.log('Registrando rota /api/auth');
  app.use('/api/auth', authRouter);
  // Se authRouter tiver rota inválida, aqui capturamos
} catch (e) {
  console.error('Erro ao registrar /api/auth:', e);
}
try {
  console.log('Registrando rota /api/campaigns');
  app.use('/api/campaigns', authenticateToken, campaignsRouter);
} catch (e) {
  console.error('Erro ao registrar /api/campaigns:', e);
}

try {
  console.log('Registrando rota /health');
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
} catch (e) {
  console.error('Erro ao registrar /health:', e);
}

// Após montar rotas, liste paths para depurar
function listRoutes() {
  if (!app._router) return;
  console.log('Rotas registradas:');
  app._router.stack.forEach(mw => {
    if (mw.route) {
      // rota direta
      console.log(Object.keys(mw.route.methods).join(','), mw.route.path);
    } else if (mw.name === 'router') {
      mw.handle.stack.forEach(handler => {
        if (handler.route) {
          console.log(Object.keys(handler.route.methods).join(','), handler.route.path);
        }
      });
    }
  });
}
listRoutes();

app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
  startScheduler();
});
