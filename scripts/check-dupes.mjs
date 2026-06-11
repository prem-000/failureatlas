import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const rows = await p.submissionEvent.findMany({
  orderBy: { timestamp: 'desc' },
  take: 10,
  include: { problem: true },
});

console.log('\n--- Recent Submissions ---');
rows.forEach(s => {
  console.log(`id=${s.id} | eventId=${s.eventId} | slug=${s.problem.slug} | status=${s.status} | attempt=${s.attemptNumber} | time=${s.timestamp.toISOString()}`);
});

// Check for rows with same problem + user within 10 minutes
console.log('\n--- Checking for duplicates (same eventId) ---');
const eventIds = rows.map(r => r.eventId);
const dupes = eventIds.filter((id, idx) => eventIds.indexOf(id) !== idx);
console.log(dupes.length > 0 ? 'DUPLICATE eventIds found: ' + dupes : 'No duplicate eventIds');

console.log('\n--- Checking for same problem within 5 minutes ---');
for (let i = 0; i < rows.length; i++) {
  for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    if (a.problemId === b.problemId && a.userId === b.userId) {
      const diff = Math.abs(a.timestamp - b.timestamp) / 1000 / 60;
      if (diff < 5) {
        console.log(`NEAR-DUPE: ${a.id} and ${b.id} - same problem (${a.problem.slug}), ${diff.toFixed(1)} min apart`);
        console.log(`  eventId A: ${a.eventId}`);
        console.log(`  eventId B: ${b.eventId}`);
      }
    }
  }
}

await p.$disconnect();
