import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      apiKey: null
    }
  });

  console.log(`Found ${users.length} users needing an API key.`);

  for (const user of users) {
    const apiKey = `fa_${crypto.randomBytes(32).toString('hex')}`;
    await prisma.user.update({
      where: { id: user.id },
      data: { apiKey }
    });
    console.log(`Updated user ${user.id} with new API key.`);
  }

  console.log('Backfill complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
