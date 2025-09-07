const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/barberhub');

// Define schemas
const subscriptionSchema = new mongoose.Schema({
  userId: String,
  plan: String,
  status: String,
  razorpaySubscriptionId: String,
  razorpayPlanId: String,
  razorpayCustomerId: String,
  startDate: Date,
  endDate: Date,
  amount: Number,
  billingCycle: String,
  isTrial: Boolean,
  razorpayOrderId: String,
  pausedAt: Date,
  lastPaymentDate: Date,
  nextPaymentDate: Date,
  trialEndDate: Date
});

const salonSchema = new mongoose.Schema({
  ownerId: String,
  name: String,
  slug: String,
  address: Object,
  contact: Object,
  businessHours: Object,
  description: String,
  amenities: Array,
  isVerified: Boolean,
  isActive: Boolean,
  subscriptionId: String,
  settings: Object,
  stats: Object
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);
const Salon = mongoose.model('Salon', salonSchema);

async function clearAllData() {
  try {
    console.log('🧹 Starting cleanup process...');
    
    // Get all subscriptions
    const subscriptions = await Subscription.find({});
    console.log(`📊 Found ${subscriptions.length} subscriptions`);
    
    // Get all salons
    const salons = await Salon.find({});
    console.log(`🏪 Found ${salons.length} salons`);
    
    // Delete all subscriptions
    if (subscriptions.length > 0) {
      await Subscription.deleteMany({});
      console.log('✅ Deleted all subscriptions from database');
    }
    
    // Delete all salons
    if (salons.length > 0) {
      await Salon.deleteMany({});
      console.log('✅ Deleted all salons from database');
    }
    
    console.log('\n🎉 Cleanup completed successfully!');
    console.log('\n📋 What was cleared:');
    console.log('   - All subscription records from database');
    console.log('   - All salon records from database');
    console.log('\n⚠️  Note: Razorpay subscriptions are still active in Razorpay dashboard');
    console.log('   You may need to cancel them manually from Razorpay dashboard if needed');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Confirmation prompt
console.log('⚠️  WARNING: This will delete ALL subscriptions and salons from the database!');
console.log('   This action cannot be undone.');
console.log('\n📋 What will be deleted:');
console.log('   - All subscription records');
console.log('   - All salon records');
console.log('\n🚀 Starting cleanup in 3 seconds...');

setTimeout(() => {
  clearAllData();
}, 3000);
