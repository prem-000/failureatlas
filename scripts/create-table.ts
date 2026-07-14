import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Connected.');

    console.log('Creating table learning_sheets if not exists...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "learning_sheets" (
          "id" TEXT NOT NULL,
          "topic" TEXT NOT NULL,
          "slug" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "difficulty" TEXT NOT NULL,
          "language" TEXT NOT NULL DEFAULT 'English',
          "version" INTEGER NOT NULL DEFAULT 1,
          "json" JSONB NOT NULL,
          "hash" TEXT NOT NULL,
          "generatedBy" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,

          CONSTRAINT "learning_sheets_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('Table learning_sheets created or already exists.');

    console.log('Creating indexes...');
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "learning_sheets_slug_key" ON "learning_sheets"("slug");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "learning_sheets_topic_difficulty_language_version_key" ON "learning_sheets"("topic", "difficulty", "language", "version");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "learning_sheets_category_idx" ON "learning_sheets"("category");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "learning_sheets_slug_idx" ON "learning_sheets"("slug");
    `);
    console.log('Indexes created successfully.');

  } catch (error) {
    console.error('Error executing query:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
