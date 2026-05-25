require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('TRUNCATE TABLE "AuditLog"')
  .then(() => { console.log('Audit log cleared!'); process.exit(0); })
  .catch(e => { console.error(e.message); process.exit(1); });