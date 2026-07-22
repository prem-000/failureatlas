import { prisma } from '../src/lib/db/prisma';
import { notificationService } from '../src/lib/notifications/notification.service';

async function runVerification() {
  console.log('🧪 Starting NotificationService Verification Script...');

  // 1. Find a test user or fallback to first user in database
  let user = await prisma.user.findFirst();

  if (!user) {
    console.log('👤 Creating temporary test user...');
    user = await prisma.user.create({
      data: {
        email: 'test-user@example.com',
        name: 'Test User',
        notificationPreference: {
          create: {
            dailyMission: true,
            practiceReminder: true,
            failureSummary: true,
            weeklyDigest: true,
            engagementReminder: true,
          },
        },
      },
    });
  }

  console.log(`👤 Using test user: ${user.email} (ID: ${user.id})`);

  // 2. Test sendWelcomeEmail
  console.log('\n📧 1. Testing sendWelcomeEmail()...');
  const welcomeRes = await notificationService.sendWelcomeEmail(user.id);
  console.log('✅ Welcome email result:', welcomeRes);

  // 3. Test sendDailyReminder
  console.log('\n📧 2. Testing sendDailyReminder()...');
  const reminderRes = await notificationService.sendDailyReminder(user.id);
  console.log('✅ Daily reminder result:', reminderRes);

  // 4. Test sendIncompleteSubmissionReminder
  console.log('\n📧 3. Testing sendIncompleteSubmissionReminder()...');
  const incompleteRes = await notificationService.sendIncompleteSubmissionReminder(user.id);
  console.log('✅ Incomplete submission reminder result:', incompleteRes);

  // 5. Test sendPasswordResetEmail
  console.log('\n📧 4. Testing sendPasswordResetEmail()...');
  const resetRes = await notificationService.sendPasswordResetEmail(user.id, 'test-reset-token-12345');
  console.log('✅ Password reset email result:', resetRes);

  // 6. Test sendVerificationEmail
  console.log('\n📧 5. Testing sendVerificationEmail()...');
  const verifyRes = await notificationService.sendVerificationEmail(user.id, 'test-verify-token-67890');
  console.log('✅ Verification email result:', verifyRes);

  console.log('\n🎉 Verification finished successfully!');
}

runVerification()
  .catch(err => {
    console.error('❌ Verification failed:', err);
  })
  .finally(() => prisma.$disconnect());
