import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('=== All Users ===');
  users.forEach(u => console.log(`User: ${u.id} | Email: ${u.email} | Name: ${u.name}`));

  const allSubs = await prisma.submissionEvent.findMany({
    include: { problem: true },
    orderBy: { timestamp: 'desc' }
  });
  console.log(`\n=== All Submissions in DB (count: ${allSubs.length}) ===`);
  allSubs.forEach(s => {
    console.log(`Sub: ${s.id} | User: ${s.userId} | Event: ${s.eventId} | Status: ${s.status} | Time: ${s.timestamp}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
