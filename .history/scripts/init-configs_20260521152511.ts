/**
 * Initialize SLA and warranty configs in the database if they don't exist.
 * Run this once after adding the models to schema.prisma
 */

import { PrismaClient } from '@prisma/client';
import { DEFAULT_SLA_TIERS } from '../src/lib/sla';
import { DEFAULT_WARRANTY_ENTRIES } from '../src/lib/warrantyConfig';

const prisma = new PrismaClient();

async function initializeConfigs() {
  try {
    // Initialize SLA config
    const slaConfig = await prisma.sLAConfig.upsert({
      where: { id: 'sla-config' },
      update: {},
      create: {
        id: 'sla-config',
        tiers: DEFAULT_SLA_TIERS,
      },
    });
    console.log('✓ SLA config initialized:', slaConfig);

    // Initialize warranty config
    const warrantyConfig = await prisma.warrantyConfig.upsert({
      where: { id: 'warranty-config' },
      update: {},
      create: {
        id: 'warranty-config',
        entries: DEFAULT_WARRANTY_ENTRIES,
      },
    });
    console.log('✓ Warranty config initialized:', warrantyConfig);

    console.log('\n✓ Configuration initialized successfully');
  } catch (error) {
    console.error('✗ Failed to initialize configs:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initializeConfigs();
