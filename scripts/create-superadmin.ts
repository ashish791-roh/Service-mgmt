import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'superadmin@fixhub.com';
  const password = 'changeme123';
  
  // Clean up any existing superadmin
  await prisma.user.deleteMany({
    where: { email },
  });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: 'HQ Super Admin',
      email,
      password: hashedPassword,
      role: 'super_admin',
      isActive: true,
      branchId: 'hq', // Not tied to a branch
    },
  });

  console.log(`\n==================================================`);
  console.log(`✅ Super Admin created successfully!`);
  console.log(`--------------------------------------------------`);
  console.log(`📧 Email:    ${user.email}`);
  console.log(`🔑 Password: ${password}`);
  console.log(`👤 Role:     ${user.role}`);
  console.log(`==================================================\n`);
}

main()
  .catch((e) => {
    console.error('Error seeding superadmin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
