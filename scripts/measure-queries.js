const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function run() {
  console.log('--- Measuring Database Query Performance ---');
  
  // Get a test user or admin
  const user = await prisma.user.findFirst({
    where: { role: 'admin' }
  });
  
  if (!user) {
    console.error('No admin user found to test with.');
    process.exit(1);
  }
  
  console.log(`Testing with user: ${user.email} (Role: ${user.role}, Branch: ${user.branchId || 'default'})\n`);
  
  const branchId = user.branchId || 'default';
  
  // Phase 1 Admin Queries
  console.log('--- Phase 1 (Admin/SuperAdmin) ---');
  
  await measure('Customer.findMany (take 20)', () => 
    prisma.customer.findMany({ where: { branchId }, orderBy: { createdAt: 'desc' }, take: 20 })
  );
  
  await measure('Device.findMany (take 20)', () => 
    prisma.device.findMany({ where: { branchId }, orderBy: { createdAt: 'desc' }, take: 20 })
  );
  
  await measure('Job.findMany (take 100 with activities and photos)', () => 
    prisma.job.findMany({ 
      where: { branchId }, 
      orderBy: { createdAt: 'desc' }, 
      take: 100, 
      include: { activities: true, photos: true } 
    })
  );
  
  await measure('Notification.findMany (take 50)', () => 
    prisma.notification.findMany({ where: { branchId }, orderBy: { createdAt: 'desc' }, take: 50 })
  );
  
  await measure('Job.count (Completed/Delivered)', () => 
    prisma.job.count({ where: { status: { in: ['Completed', 'Delivered'] }, branchId } })
  );
  
  await measure('Job.count (Pending)', () => 
    prisma.job.count({ where: { status: { in: ['New', 'Assigned', 'In Progress'] }, branchId } })
  );
  
  await measure('User.count (Engineers)', () => 
    prisma.user.count({ where: { role: 'engineer', branchId } })
  );
  
  await measure('User.count (Active Engineers)', () => 
    prisma.user.count({ where: { role: 'engineer', isActive: true, branchId } })
  );
  
  await measure('PartRequest.count (Pending/Awaiting)', () => 
    prisma.partRequest.count({ where: { status: { in: ['Pending', 'AwaitingStock'] }, branchId } })
  );
  
  await measure('InventoryItem raw low stock count query', () => 
    prisma.$queryRaw`SELECT COUNT(*) as count FROM "InventoryItem" WHERE "branchId" = ${branchId} AND "quantity" <= "minQuantity"`
  );
  
  await measure('Job raw revenue query', () => 
    prisma.$queryRaw`SELECT SUM(COALESCE("actualCost", COALESCE("estimatedCost", 0))) as sum FROM "Job" WHERE "branchId" = ${branchId} AND "status" IN ('Completed', 'Delivered')`
  );
  
  await measure('Sale raw revenue query', () => 
    prisma.$queryRaw`SELECT SUM(COALESCE("totalAmount", 0)) as sum FROM "Sale" WHERE "branchId" = ${branchId}`
  );
  
  // Phase 2 Admin Queries
  console.log('\n--- Phase 2 (Admin/SuperAdmin) ---');
  
  await measure('User.findMany (take 50)', () => 
    prisma.user.findMany({ where: { branchId }, orderBy: { createdAt: 'asc' }, take: 50 })
  );
  
  await measure('PartRequest.findMany (take 50)', () => 
    prisma.partRequest.findMany({ where: { branchId }, orderBy: { createdAt: 'desc' }, take: 50 })
  );
  
  await measure('InventoryItem.findMany (take 50)', () => 
    prisma.inventoryItem.findMany({ where: { branchId }, orderBy: { name: 'asc' }, take: 50 })
  );
  
  await measure('Sale.findMany with items (take 100)', () => 
    prisma.sale.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { items: true }
    })
  );

  console.log('\n--- Checking row counts in DB ---');
  await printCount('User');
  await printCount('Customer');
  await printCount('Device');
  await printCount('Job');
  await printCount('JobActivity');
  await printCount('JobPhoto');
  await printCount('PartRequest');
  await printCount('InventoryItem');
  await printCount('Sale');
  await printCount('SaleItem');
  
  prisma.$disconnect();
}

async function measure(name, queryFn) {
  const start = performance.now();
  try {
    await queryFn();
    const duration = (performance.now() - start).toFixed(2);
    console.log(`  ✓ ${name.padEnd(55)} : ${duration} ms`);
  } catch (err) {
    console.log(`  ✗ ${name.padEnd(55)} : Failed with error: ${err.message}`);
  }
}

async function printCount(table) {
  try {
    const count = await prisma[table.charAt(0).toLowerCase() + table.slice(1)].count();
    console.log(`  ${table.padEnd(20)}: ${count} rows`);
  } catch (err) {
    console.log(`  ${table.padEnd(20)}: Failed to count (${err.message})`);
  }
}

run().catch(console.error);
