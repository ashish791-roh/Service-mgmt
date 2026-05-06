import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const hash = await bcrypt.hash('admin@fixhub123', 10);

const user = await prisma.user.create({
  data: {
    name: 'Admin',
    email: 'admin@fixhub.com',
    password: hash,
    role: 'admin',
    isActive: true,
  },
});

console.log('Admin created:', user.email);
await prisma.$disconnect();