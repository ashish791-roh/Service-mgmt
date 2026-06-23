const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const client = new Client({ connectionString });

client.connect()
  .then(async () => {
    const res = await client.query('SELECT * FROM "Session" ORDER BY "createdAt" DESC;');
    console.log(`Found ${res.rows.length} sessions:`);
    res.rows.forEach((row, i) => {
      console.log(`[${i}] Token: ${row.token.substring(0,8)}... CreatedAt: ${row.createdAt} ExpiresAt: ${row.expiresAt}`);
    });
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
