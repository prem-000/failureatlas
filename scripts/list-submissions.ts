import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const subs = await prisma.submissionEvent.findMany({
    include: { problem: true },
    orderBy: { timestamp: 'desc' },
    take: 20,
  });
  
  console.log('=== Recent Submissions ===');
  subs.forEach(s => {
    console.log(`ID: ${s.id} | EventID: ${s.eventId} | Slug: ${s.problem.slug} | Title: ${s.problem.title} | Status: ${s.status} | Time: ${s.timestamp}`);
  });
  console.log(`\nTotal shown: ${subs.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
