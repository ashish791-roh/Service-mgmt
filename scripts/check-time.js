const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const client = new Client({ connectionString });

client.connect()
  .then(async () => {
    const dbRes = await client.query('SELECT NOW() as db_now;');
    const dbNow = dbRes.rows[0].db_now;
    const nodeNow = new Date();
    
    console.log('Database Time (UTC/db):', dbNow);
    console.log('Node JS Time (local):   ', nodeNow);
    console.log('Node JS UTC string:     ', nodeNow.toUTCString());
    console.log('Difference (ms):        ', Math.abs(new Date(dbNow) - nodeNow));
    
    const sessions = await client.query('SELECT * FROM "Session" ORDER BY "createdAt" DESC LIMIT 1;');
    if (sessions.rows.length > 0) {
      const session = sessions.rows[0];
      console.log('\nLast Created Session:');
      console.log('Token:    ', session.token.substring(0, 8) + '...');
      console.log('ExpiresAt:', session.expiresAt);
      console.log('IdleAt:   ', session.idleAt);
      console.log('CreatedAt:', session.createdAt);
      
      const now = new Date();
      console.log('Expired?  ', new Date(session.expiresAt) < now);
      console.log('Idle Out? ', new Date(session.idleAt) < now);
    } else {
      console.log('\nNo sessions found.');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
