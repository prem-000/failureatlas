import { prisma } from '../src/lib/db/prisma';

// Use dynamic import or fetch for API calls
async function runE2ETests() {
  console.log('🚀 Starting E2E Integration Flow Tests...');

  const baseUrl = 'http://127.0.0.1:3000/api';

  try {
    // 1. Try to authenticate (Login)
    console.log('🔑 Authenticating as test@example.com...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    const loginData = await loginRes.json();
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${JSON.stringify(loginData.error)}`);
    }

    const token = loginData.data?.token?.token || loginData.token;
    console.log('✅ Authenticated successfully! Token obtained.');

    // 2. Submit a new failure event (Ingest and analyze)
    console.log('\n📥 Ingesting and analyzing a failing binary search submission...');
    const submissionId = 'test-event-' + Math.random().toString(36).substring(7);
    
    const ingestRes = await fetch(`${baseUrl}/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        eventId: submissionId,
        sessionId: 'test-session-123',
        problemSlug: 'two-sum',
        problemTitle: 'Two Sum',
        problemDifficulty: 'Easy',
        problemTopics: ['Array'],
        problemUrl: 'https://leetcode.com/problems/two-sum/',
        submissionStatus: 'Wrong Answer',
        submissionLanguage: 'javascript',
        submissionCode: 'while (left < right) {\n  // buggy search boundary\n}',
        timeSpent: 300,
        attemptNumber: 2,
        rapidSubmission: false
      })
    });

    const ingestData = await ingestRes.json();
    if (!ingestRes.ok) {
      throw new Error(`Ingestion failed: ${JSON.stringify(ingestData.error)}`);
    }
    console.log(`✅ Ingestion successful! Submission ID: ${ingestData.submissionId}`);
    console.log(`🔍 Root Cause Detected: ${ingestData.data?.analysis?.rootCauseHypotheses[0]?.name}`);
    console.log(`💪 Primary Systemic Weakness: ${ingestData.data?.analysis?.systemicWeaknesses[0]?.name}`);

    // 3. Retrieve PageRank weaknesses
    console.log('\n📊 Fetching PageRank scored weaknesses...');
    const weaknessesRes = await fetch(`${baseUrl}/graph/weaknesses?limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const weaknessesData = await weaknessesRes.json();
    if (!weaknessesRes.ok) {
      throw new Error(`Failed to fetch weaknesses: ${JSON.stringify(weaknessesData.error)}`);
    }
    console.log(`✅ Weaknesses fetched successfully. Count: ${weaknessesData.weaknesses?.length}`);
    for (const w of weaknessesData.weaknesses || []) {
      console.log(`   - ${w.name}: PageRank Score = ${w.pageRankScore.toFixed(4)}`);
    }

    // 4. Generate diagnosis report
    console.log('\n🧠 Generating personalized diagnosis report...');
    const diagRes = await fetch(`${baseUrl}/diagnosis/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        analysisScope: 'recent'
      })
    });

    const diagData = await diagRes.json();
    if (!diagRes.ok) {
      throw new Error(`Diagnosis generation failed: ${JSON.stringify(diagData.error)}`);
    }
    
    console.log('✅ Diagnosis generated successfully!');
    console.log(`🔍 Primary Weakness: ${diagData.diagnosis?.primaryWeakness?.name} (Confidence: ${diagData.diagnosis?.primaryWeakness?.confidence}%)`);
    console.log(`📚 Recommendations Count: ${diagData.diagnosis?.learningRecommendations?.length}`);
    for (const rec of diagData.diagnosis?.learningRecommendations || []) {
      console.log(`   * ${rec.name}: ${rec.description}`);
    }

    console.log('\n✨ ALL E2E INTEGRATION TESTS COMPLETED SUCCESSFULLY! ✨');

  } catch (error: any) {
    console.error('\n❌ E2E Integration Tests failed:', error.message);
    process.exit(1);
  } finally {
    // Ensure all prisma instances are closed
    await prisma.$disconnect();
  }
}

runE2ETests();
