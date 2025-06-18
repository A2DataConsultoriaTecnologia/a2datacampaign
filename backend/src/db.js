// backend/src/db.js
const { Pool } = require('pg');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  const { PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD } = process.env;
  if (PGHOST && PGPORT && PGDATABASE && PGUSER && PGPASSWORD) {
    connectionString = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
  }
}
const isProduction = process.env.NODE_ENV === 'production';
const poolConfig = { connectionString };
if (connectionString && isProduction) {
  poolConfig.ssl = { rejectUnauthorized: false };
} else {
  poolConfig.ssl = false;
}
const pool = new Pool(poolConfig);
pool.on('error', err => {
  console.error('Erro inesperado no cliente do Postgres', err);
  process.exit(-1);
});
module.exports = pool;
