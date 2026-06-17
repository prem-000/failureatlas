import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('Connected!');

    console.log('Adding missing columns...');
    
    // Check if column exists, if not, add it
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "providerId" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "apiKey" TEXT;`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;`);

    // Ensure apiKey is unique if it doesn't already have a unique constraint
    try {
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "users_apiKey_key" ON "users"("apiKey");`);
    } catch (e) {
      console.log('Unique constraint might already exist or failed:', e);
    }
    
    console.log('Missing columns added successfully!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
