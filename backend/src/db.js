// backend/src/db.js
const { Pool } = require('pg');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Em produção, process.env.DATABASE_URL já deve existir via reference variable no Railway.
  // O fallback local só ocorre em dev, mas em produção não deve ser usado.
  const { PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD } = process.env;
  if (PGHOST && PGPORT && PGDATABASE && PGUSER && PGPASSWORD) {
    connectionString = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
  }
}

// Detectar ambiente de produção
const isProduction = process.env.NODE_ENV === 'production';
const poolConfig = { connectionString };

// Opcional: log para debug inicial (em produção, cuidado em redigir, talvez mascarar valores)
// console.log('DB connectionString:', connectionString ? '[REDACTED]' : 'não definida');
// console.log('NODE_ENV:', process.env.NODE_ENV, 'isProduction:', isProduction);

if (connectionString && isProduction) {
  poolConfig.ssl = { rejectUnauthorized: false };
} else {
  poolConfig.ssl = false;
}
// console.log('Using SSL for PG:', poolConfig.ssl);

const pool = new Pool(poolConfig);

pool.on('error', err => {
  console.error('Erro inesperado no cliente do Postgres', err);
  process.exit(-1);
});

module.exports = pool;
