require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('Iniciando backend...');
console.log('FRONTEND_URL=', process.env.FRONTEND_URL);

const app = express();

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

// Servir uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Registrar rotas dentro de try/catch
try {
  console.log('Registrando rota /api/auth');
  const authRouter = require('./routes/auth');
  app.use('/api/auth', authRouter);
} catch (e) {
  console.error('Erro ao registrar /api/auth:', e);
}
try {
  console.log('Registrando rota /api/campaigns');
  const authenticateToken = require('./utils/authMiddleware');
  const campaignsRouter = require('./routes/campaigns');
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

// Listar rotas para depuração
function listRoutes() {
  if (!app._router) {
    console.log('Nenhum router disponível');
    return;
  }
  console.log('Rotas registradas:');
  app._router.stack.forEach(mw => {
    if (mw.route) {
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
  try {
    const startScheduler = require('./services/scheduler');
    startScheduler();
  } catch(err) {
    console.error('Erro ao iniciar scheduler:', err);
  }
});
