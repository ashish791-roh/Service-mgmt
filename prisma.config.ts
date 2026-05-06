import type { PrismaConfig } from 'prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

export default {
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  migrate: {
    async adapter() {
      // DATABASE_URL is only resolved at runtime (not at prisma generate time)
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) throw new Error('DATABASE_URL is not set');
      const pool = new pg.Pool({ connectionString });
      return new PrismaPg(pool);
    },
  },
} satisfies PrismaConfig;