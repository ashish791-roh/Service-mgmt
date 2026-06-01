import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Fetching current users from database...');
  const users = await prisma.user.findMany();
  console.log('Current users count:', users.length);
  for (const u of users) {
    console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Active: ${u.isActive}`);
  }

  // Ensure Admin user
  const adminEmail = 'admin@fixhub.com';
  const adminPassword = 'admin@fixhub123';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  
  const existingAdmin = users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase());
  if (existingAdmin) {
    console.log(`Updating existing admin user: ${adminEmail}`);
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        password: adminHash,
        role: 'admin',
        isActive: true,
      }
    });
  } else {
    console.log(`Creating new admin user: ${adminEmail}`);
    await prisma.user.create({
      data: {
        name: 'Admin User',
        email: adminEmail,
        password: adminHash,
        role: 'admin',
        isActive: true,
      }
    });
  }

  // Ensure Receptionist user
  const receptionEmail = 'reception@fixhub.com';
  const receptionPassword = 'reception@fixhub123';
  const receptionHash = await bcrypt.hash(receptionPassword, 10);

  const existingReception = users.find(u => u.email.toLowerCase() === receptionEmail.toLowerCase());
  if (existingReception) {
    console.log(`Updating existing reception user: ${receptionEmail}`);
    await prisma.user.update({
      where: { id: existingReception.id },
      data: {
        password: receptionHash,
        role: 'reception',
        isActive: true,
      }
    });
  } else {
    console.log(`Creating new reception user: ${receptionEmail}`);
    await prisma.user.create({
      data: {
        name: 'Reception User',
        email: receptionEmail,
        password: receptionHash,
        role: 'reception',
        isActive: true,
      }
    });
  }

  console.log('Verifying final user list...');
  const finalUsers = await prisma.user.findMany();
  for (const u of finalUsers) {
    console.log(`- Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, Active: ${u.isActive}`);
  }
}

main()
  .catch((err) => {
    console.error('Error in script:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
