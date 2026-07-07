import { prisma } from '../src/lib/db/prisma';
import { createFingerprint, normalizeSourceCode } from '../src/lib/fingerprint/fingerprint';
import { DIAGNOSIS_MODEL_VERSION } from '../src/lib/diagnosis/generator';

async function runTest() {
  console.log('--- Testing Fingerprint Normalization ---');
  const code1 = 'for i in range(n):\r\n    print(i)   \n\n';
  const code2 = 'for i in range(n):\n    print(i)';
  const norm1 = normalizeSourceCode(code1);
  const norm2 = normalizeSourceCode(code2);
  console.log(`Normalized 1:\n${JSON.stringify(norm1)}`);
  console.log(`Normalized 2:\n${JSON.stringify(norm2)}`);
  if (norm1 === norm2) {
    console.log('✅ Normalization matches successfully!');
  } else {
    console.error('❌ Normalization failed to match!');
    process.exit(1);
  }

  // Find or create test user
  let user = await prisma.user.findFirst();
  if (!user) {
    console.log('Creating test user...');
    user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User'
      }
    });
  }

  // Find or create test problem
  let problem = await prisma.problem.findFirst();
  if (!problem) {
    console.log('Creating test problem...');
    problem = await prisma.problem.create({
      data: {
        slug: 'two-sum',
        title: 'Two Sum',
        difficulty: 'Easy',
        topics: ['Array']
      }
    });
  }

  // Create systemic weakness if not exist
  let weakness = await prisma.systemicWeakness.findFirst();
  if (!weakness) {
    weakness = await prisma.systemicWeakness.create({
      data: {
        name: 'edge-case-reasoning',
        type: 'edge-case-reasoning',
        severity: 'high',
        confidence: 0.85
      }
    });
  }

  console.log('--- Testing Fingerprint Generation ---');
  const submissionData = {
    userId: user.id,
    problemSlug: problem.slug,
    language: 'python3',
    status: 'Wrong Answer',
    code: 'def twoSum(): pass'
  };

  const { fingerprint, codeHash } = createFingerprint(submissionData);
  console.log(`Generated Fingerprint: ${fingerprint}`);
  console.log(`Generated Code Hash: ${codeHash}`);

  // Clean up any existing diagnosis for this fingerprint
  await prisma.diagnosisResult.deleteMany({
    where: { fingerprint }
  });

  // 1. Create a submission
  const sub1 = await prisma.submissionEvent.create({
    data: {
      userId: user.id,
      problemId: problem.id,
      eventId: `test-sub-1-${Date.now()}`,
      sessionId: 'session-test',
      timestamp: new Date(),
      status: 'Wrong Answer',
      language: 'python3',
      code: 'def twoSum(): pass',
      timeSpent: 100,
      attemptNumber: 1
    }
  });

  // 2. Create DiagnosisResult
  const diagnosis = await prisma.diagnosisResult.create({
    data: {
      userId: user.id,
      submissionId: sub1.id,
      primaryWeaknessId: weakness.id,
      fingerprint,
      codeHash,
      modelVersion: DIAGNOSIS_MODEL_VERSION,
      diagnosisJson: { mock: 'diagnosis' } as any,
      progressMetrics: { confidence: 85, reasoningChain: 'Mock reasoning' }
    }
  });
  console.log('✅ Saved test DiagnosisResult to DB.');

  // 3. Create a second submission with the SAME fingerprint (duplicate code, status, language, problem)
  const sub2 = await prisma.submissionEvent.create({
    data: {
      userId: user.id,
      problemId: problem.id,
      eventId: `test-sub-2-${Date.now()}`,
      sessionId: 'session-test',
      timestamp: new Date(),
      status: 'Wrong Answer',
      language: 'python3',
      code: 'def twoSum(): pass',
      timeSpent: 120,
      attemptNumber: 2
    }
  });

  // 4. Test fallback lookup by fingerprint
  console.log('--- Testing Fallback Lookup by Fingerprint ---');
  const dbSub2 = await prisma.submissionEvent.findUnique({
    where: { id: sub2.id },
    include: { diagnosis: true }
  });

  if (dbSub2 && dbSub2.diagnosis) {
    console.error('❌ Error: sub2 should not have direct diagnosis link yet.');
    process.exit(1);
  }

  // Resolve diagnosis via fingerprint
  const resolvedFingerprint = createFingerprint({
    userId: dbSub2!.userId,
    problemSlug: problem.slug, // in actual route we fetch problem or map slug
    language: dbSub2!.language,
    status: dbSub2!.status,
    code: dbSub2!.code
  }).fingerprint;

  const resolvedDiagnosis = await prisma.diagnosisResult.findUnique({
    where: { fingerprint: resolvedFingerprint }
  });

  if (resolvedDiagnosis && (resolvedDiagnosis.diagnosisJson as any)?.mock === 'diagnosis') {
    console.log('✅ Fallback fingerprint lookup successfully resolved cached diagnosis!');
  } else {
    console.error('❌ Fingerprint fallback lookup failed!');
    process.exit(1);
  }

  // Clean up
  await prisma.diagnosisResult.delete({ where: { id: diagnosis.id } });
  await prisma.submissionEvent.deleteMany({ where: { id: { in: [sub1.id, sub2.id] } } });
  console.log('✅ Clean up complete.');
  console.log('✨ ALL CACHING LOGIC TESTS PASSED SUCCESSFULLY! ✨');
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
