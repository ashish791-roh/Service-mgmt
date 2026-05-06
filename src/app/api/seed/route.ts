import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// ── Production guard ──────────────────────────────────────────────
// The seed endpoint is only available in development.
// In production it returns 404 so it can never be accidentally hit.
if (process.env.NODE_ENV === 'production') {
  // Exporting no-op handlers prevents Next.js from registering the route
  // in a meaningful way, but we also guard inside each handler below.
}

function isProd() {
  return process.env.NODE_ENV === 'production';
}

// ─── Full demo seed data ──────────────────────────────────────────────────────

const USERS = [
  { name: 'Arjun Sharma',  email: 'admin@fixhub.com',      password: 'admin123', role: 'admin',     isActive: true },
  { name: 'Priya Mehta',   email: 'reception@fixhub.com',  password: 'rec123',   role: 'reception', isActive: true },
  { name: 'Rohan Verma',   email: 'eng1@fixhub.com',       password: 'eng123',   role: 'engineer',  isActive: true },
  { name: 'Kiran Nair',    email: 'eng2@fixhub.com',       password: 'eng456',   role: 'engineer',  isActive: true },
  { name: 'Deepak Singh',  email: 'eng3@fixhub.com',       password: 'eng789',   role: 'engineer',  isActive: false },
];

const CUSTOMERS = [
  { name: 'Amit Gupta',   phone: '9876543210', address: '12 MG Road, Delhi' },
  { name: 'Sunita Patel', phone: '9123456789', address: '45 Nehru Nagar, Mumbai' },
  { name: 'Rajesh Kumar', phone: '9988776655', address: '7 Civil Lines, Bangalore' },
  { name: 'Meera Joshi',  phone: '9765432100', address: '33 Park Street, Kolkata' },
];

const DEVICES_BY_CUSTOMER = [
  { type: 'Laptop',     brand: 'Dell',    model: 'Inspiron 15', serialNo: 'DL2024001' },
  { type: 'Smartphone', brand: 'Samsung', model: 'Galaxy S23',  serialNo: 'SG2024002' },
  { type: 'Desktop',    brand: 'HP',      model: 'Pavilion 24', serialNo: 'HP2024003' },
  { type: 'Tablet',     brand: 'Apple',   model: 'iPad Pro',    serialNo: 'AP2024004' },
];

const INVENTORY = [
  { sku: 'LCD-15-001',  name: 'LCD Screen Panel 15"',   quantity: 3,  unitPrice: 2200, category: 'Display',    minQuantity: 2 },
  { sku: 'CHG-USBC-001',name: 'Charging Port USB-C',    quantity: 8,  unitPrice: 350,  category: 'Charging',   minQuantity: 5 },
  { sku: 'BAT-4000-001',name: 'Laptop Battery 4000mAh', quantity: 5,  unitPrice: 1500, category: 'Battery',    minQuantity: 3 },
  { sku: 'NET-WIFI-001',name: 'WiFi Antenna Module',    quantity: 1,  unitPrice: 800,  category: 'Network',    minQuantity: 2 },
  { sku: 'CON-PASTE-001',name: 'Thermal Paste',         quantity: 15, unitPrice: 120,  category: 'Consumable', minQuantity: 5 },
  { sku: 'MEM-DDR4-8G', name: 'RAM DDR4 8GB',           quantity: 4,  unitPrice: 2800, category: 'Memory',     minQuantity: 2 },
  { sku: 'STO-SSD-256', name: 'SSD 256GB',              quantity: 2,  unitPrice: 3500, category: 'Storage',    minQuantity: 3 },
];

// ─── Core seed function ───────────────────────────────────────────────────────

async function runSeed() {
  const hashed = await Promise.all(
    USERS.map(async (u) => ({ ...u, password: await bcrypt.hash(u.password, 10) }))
  );
  const createdUsers = await Promise.all(
    hashed.map((u) => prisma.user.create({ data: u }))
  );

  const eng1 = createdUsers.find((u) => u.email === 'eng1@fixhub.com')!;
  const eng2 = createdUsers.find((u) => u.email === 'eng2@fixhub.com')!;

  const createdCustomers = await Promise.all(
    CUSTOMERS.map((c) => prisma.customer.create({ data: c }))
  );

  const createdDevices = await Promise.all(
    DEVICES_BY_CUSTOMER.map((d, i) =>
      prisma.device.create({ data: { ...d, customerId: createdCustomers[i].id } })
    )
  );

  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

  const jobDefs = [
    {
      customerId:    createdCustomers[0].id,
      deviceId:      createdDevices[0].id,
      engineerId:    eng1.id,
      status:        'In Progress',
      problemDesc:   'Screen flickering and battery draining fast',
      estimatedCost: 3500,
      createdAt:     daysAgo(24),
      updatedAt:     daysAgo(22),
    },
    {
      customerId:    createdCustomers[1].id,
      deviceId:      createdDevices[1].id,
      engineerId:    eng2.id,
      status:        'Assigned',
      problemDesc:   'Phone not charging, screen cracked',
      estimatedCost: 5500,
      createdAt:     daysAgo(16),
      updatedAt:     daysAgo(16),
    },
    {
      customerId:    createdCustomers[2].id,
      deviceId:      createdDevices[2].id,
      engineerId:    null,
      status:        'New',
      problemDesc:   'System not booting, blue screen error',
      estimatedCost: 2000,
      createdAt:     daysAgo(6),
      updatedAt:     daysAgo(6),
    },
    {
      customerId:    createdCustomers[3].id,
      deviceId:      createdDevices[3].id,
      engineerId:    eng1.id,
      status:        'Completed',
      problemDesc:   'iPad not connecting to WiFi',
      estimatedCost: 1500,
      actualCost:    1200,
      repairNotes:   'Replaced WiFi antenna module',
      createdAt:     daysAgo(14),
      updatedAt:     daysAgo(5),
      completedAt:   daysAgo(5),
    },
    {
      customerId:    createdCustomers[0].id,
      deviceId:      createdDevices[0].id,
      engineerId:    eng2.id,
      status:        'Delivered',
      problemDesc:   'Keyboard keys not working properly',
      estimatedCost: 1800,
      actualCost:    1800,
      createdAt:     daysAgo(29),
      updatedAt:     daysAgo(26),
      completedAt:   daysAgo(26),
    },
  ];

  const createdJobs = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jobDefs.map((j) => prisma.job.create({ data: j as any }))
  );

  await prisma.partRequest.createMany({
    data: [
      {
        jobId:      createdJobs[0].id,
        engineerId: eng1.id,
        partName:   'LCD Screen Panel 15"',
        quantity:   1,
        reason:     'Screen completely damaged, needs replacement',
        status:     'Pending',
      },
      {
        jobId:      createdJobs[1].id,
        engineerId: eng2.id,
        partName:   'Charging Port USB-C',
        quantity:   1,
        reason:     'Port pins are bent and broken',
        status:     'Approved',
        reviewedAt: daysAgo(15),
      },
      {
        jobId:      createdJobs[3].id,
        engineerId: eng1.id,
        partName:   'WiFi Antenna Module',
        quantity:   1,
        reason:     'Antenna completely burned out',
        status:     'Approved',
        reviewedAt: daysAgo(12),
      },
    ],
  });

  await prisma.inventoryItem.createMany({ data: INVENTORY });

  await prisma.notification.createMany({
    data: [
      { userId: eng1.id, message: 'New job assigned: Dell Laptop — Screen flickering',     jobId: createdJobs[0].id, read: false },
      { userId: eng2.id, message: 'New job assigned: Samsung Galaxy S23 — Charging issue', jobId: createdJobs[1].id, read: false },
      { userId: eng2.id, message: 'Part request approved: USB-C Charging Port',            read: true },
      { userId: eng1.id, message: 'Part request approved: WiFi Antenna Module',            read: true },
    ],
  });

  return {
    users:     createdUsers.length,
    customers: createdCustomers.length,
    devices:   createdDevices.length,
    jobs:      createdJobs.length,
    inventory: INVENTORY.length,
  };
}

// ─── GET /api/seed ────────────────────────────────────────────────

export async function GET() {
  // Hard block in production
  if (isProd()) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  try {
    const existingCount = await prisma.user.count();

    if (existingCount > 0) {
      return NextResponse.json({
        message: `Database already seeded — ${existingCount} user(s) found. Send a POST to /api/seed to wipe and re-seed.`,
      });
    }

    const counts = await runSeed();

    return NextResponse.json({
      message: '✅ Database seeded successfully.',
      counts,
      accounts: USERS.map(({ name, email, password, role }) => ({ name, email, password, role })),
    });
  } catch (error) {
    console.error('[api/seed GET]', error);
    return NextResponse.json({ error: 'Failed to seed.', detail: String(error) }, { status: 500 });
  }
}

// ─── POST /api/seed — wipe everything + re-seed ───────────────────

export async function POST() {
  // Hard block in production
  if (isProd()) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  try {
    await prisma.notification.deleteMany();
    await prisma.partRequest.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.job.deleteMany();
    await prisma.device.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.inventoryItem.deleteMany();
    await prisma.user.deleteMany();

    const counts = await runSeed();

    return NextResponse.json({
      message: '✅ Database wiped and re-seeded.',
      counts,
      accounts: USERS.map(({ name, email, password, role }) => ({ name, email, password, role })),
    });
  } catch (error) {
    console.error('[api/seed POST]', error);
    return NextResponse.json({ error: 'Failed to reset.', detail: String(error) }, { status: 500 });
  }
}