import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Backfilling default branch...');

  // 1. Create default branch if it does not exist
  const existingBranch = await prisma.branch.findUnique({
    where: { id: 'default' }
  });

  if (!existingBranch) {
    await prisma.branch.create({
      data: {
        id: 'default',
        name: 'Default Branch',
        apiKey: 'default-branch-api-key', // Secret key for branch auth
        suspended: false
      }
    });
    console.log('Created branch with id: "default"');
  } else {
    console.log('Default branch already exists.');
  }

  console.log('Backfill finished.');
}

main()
  .catch((e) => {
    console.error('Error during backfill:', e);
    process.exit(1);
  });
