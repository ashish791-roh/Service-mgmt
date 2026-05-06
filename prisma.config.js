const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

/** @type {import('prisma').PrismaConfig} */
const config = {
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  migrate: {
    async adapter() {
      // DATABASE_URL only accessed at runtime, not at prisma generate time
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) throw new Error('DATABASE_URL is not set');
      const pool = new pg.Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
};

module.exports = config;