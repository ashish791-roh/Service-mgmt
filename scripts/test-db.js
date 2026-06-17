const { Client } = require('pg');
require('dotenv').config();

console.log('--- DB Connection Diagnostician ---');
const connectionString = process.env.DATABASE_URL;
console.log('DATABASE_URL detected:', connectionString ? connectionString.substring(0, 45) + '...' : 'NOT DEFINED');

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL is not set in process.env. Did you copy .env.local to .env?');
  process.exit(1);
}

const client = new Client({ connectionString });

console.log('Attempting raw pg client connection...');
client.connect()
  .then(() => {
    console.log('✅ Success! Raw connection to PostgreSQL succeeded.');
    return client.query('SELECT version();');
  })
  .then(res => {
    console.log('Postgres Version:', res.rows[0].version);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed with error:');
    console.error(err);
    process.exit(1);
  });
