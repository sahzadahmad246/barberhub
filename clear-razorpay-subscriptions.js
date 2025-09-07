const Razorpay = require('razorpay');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function clearRazorpaySubscriptions() {
  try {
    console.log('🧹 Starting Razorpay cleanup process...');
    
    // Get all subscriptions from Razorpay
    const subscriptions = await razorpay.subscriptions.all();
    console.log(`📊 Found ${subscriptions.count} subscriptions in Razorpay`);
    
    if (subscriptions.count === 0) {
      console.log('✅ No subscriptions found in Razorpay');
      return;
    }
    
    // Cancel all active subscriptions
    let cancelledCount = 0;
    for (const subscription of subscriptions.items) {
      try {
        if (subscription.status === 'active' || subscription.status === 'authenticated') {
          await razorpay.subscriptions.cancel(subscription.id);
          console.log(`✅ Cancelled subscription: ${subscription.id}`);
          cancelledCount++;
        } else {
          console.log(`⏭️  Skipped subscription ${subscription.id} (status: ${subscription.status})`);
        }
      } catch (error) {
        console.error(`❌ Error cancelling subscription ${subscription.id}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Razorpay cleanup completed!`);
    console.log(`   - Cancelled ${cancelledCount} active subscriptions`);
    console.log(`   - Skipped ${subscriptions.count - cancelledCount} inactive subscriptions`);
    
  } catch (error) {
    console.error('❌ Error during Razorpay cleanup:', error);
  }
}

// Confirmation prompt
console.log('⚠️  WARNING: This will cancel ALL active subscriptions in Razorpay!');
console.log('   This action cannot be undone.');
console.log('\n📋 What will be cancelled:');
console.log('   - All active Razorpay subscriptions');
console.log('   - All authenticated Razorpay subscriptions');
console.log('\n🚀 Starting Razorpay cleanup in 3 seconds...');

setTimeout(() => {
  clearRazorpaySubscriptions();
}, 3000);
