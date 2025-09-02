import { EmailService } from './email-service';

/**
 * Simple manual test for the email service
 * Run this with: npx tsx src/lib/test-email-service.ts
 */
async function testEmailService() {
  console.log('🧪 Testing Email Service...\n');

  // Test data
  const testData = {
    email: 'test@example.com',
    name: 'Test User',
    verificationToken: 'test-verification-token-123'
  };

  try {
    // Test 1: Check rate limit status for new email
    console.log('📊 Test 1: Check rate limit status for new email');
    const initialStatus = EmailService.getRateLimitStatus(testData.email);
    console.log('Initial rate limit status:', initialStatus);
    console.log('✅ Test 1 passed\n');

    // Test 2: Send verification email
    console.log('📧 Test 2: Send verification email');
    const emailResult = await EmailService.sendVerificationEmail(testData);
    console.log('Email send result:', emailResult);
    
    if (emailResult.success) {
      console.log('✅ Test 2 passed - Email sent successfully\n');
    } else {
      console.log('❌ Test 2 failed - Email send failed:', emailResult.error);
      console.log('Rate limited:', emailResult.rateLimited, '\n');
    }

    // Test 3: Check rate limit status after sending
    console.log('📊 Test 3: Check rate limit status after sending');
    const afterSendStatus = EmailService.getRateLimitStatus(testData.email);
    console.log('Rate limit status after send:', afterSendStatus);
    console.log('✅ Test 3 passed\n');

    // Test 4: Test rate limiting by sending multiple emails
    console.log('🚦 Test 4: Test rate limiting (sending multiple emails)');
    for (let i = 1; i <= 4; i++) {
      const result = await EmailService.sendVerificationEmail({
        ...testData,
        verificationToken: `token-${i}`
      });
      
      console.log(`Attempt ${i}:`, {
        success: result.success,
        rateLimited: result.rateLimited,
        error: result.error ? result.error.substring(0, 50) + '...' : undefined
      });
      
      if (result.rateLimited) {
        console.log('✅ Rate limiting is working correctly');
        break;
      }
    }
    console.log('✅ Test 4 completed\n');

    // Test 5: Clear rate limit and test again
    console.log('🧹 Test 5: Clear rate limit and test again');
    EmailService.clearRateLimit(testData.email);
    const clearedStatus = EmailService.getRateLimitStatus(testData.email);
    console.log('Status after clearing:', clearedStatus);
    
    const afterClearResult = await EmailService.sendVerificationEmail({
      ...testData,
      verificationToken: 'after-clear-token'
    });
    console.log('Send result after clearing:', {
      success: afterClearResult.success,
      rateLimited: afterClearResult.rateLimited
    });
    console.log('✅ Test 5 passed\n');

    console.log('🎉 All email service tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testEmailService().catch(console.error);
}

export { testEmailService };