import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscription extends Document {
  userId: string;
  plan: 'trial' | 'pro' | 'pro_plus';
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'pending' | 'paused' | 'failed';
  startDate: Date;
  endDate: Date;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  razorpayOrderId?: string;
  razorpayCustomerId?: string;
  razorpayPaymentId?: string;
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  trialEndDate?: Date;
  isTrial: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>({
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  plan: {
    type: String,
    enum: ['trial', 'pro', 'pro_plus'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'past_due', 'pending', 'paused', 'failed'],
    default: 'pending'
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    required: true
  },
  razorpayOrderId: {
    type: String,
    sparse: true,
    unique: true
  },
  razorpayCustomerId: {
    type: String
  },
  razorpayPaymentId: {
    type: String
  },
  lastPaymentDate: {
    type: Date
  },
  nextPaymentDate: {
    type: Date
  },
  trialEndDate: {
    type: Date
  },
  isTrial: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better performance
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ endDate: 1 });
SubscriptionSchema.index({ status: 1, endDate: 1 });

// Virtual for checking if subscription is active
SubscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' && this.endDate > new Date();
});

// Virtual for checking if subscription is in trial
SubscriptionSchema.virtual('isInTrial').get(function() {
  return this.isTrial && this.trialEndDate && this.trialEndDate > new Date();
});

// Method to check if subscription has expired
SubscriptionSchema.methods.hasExpired = function(): boolean {
  return this.endDate < new Date();
};

// Method to get days remaining
SubscriptionSchema.methods.getDaysRemaining = function(): number {
  const now = new Date();
  const diffTime = this.endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Method to get trial days remaining
SubscriptionSchema.methods.getTrialDaysRemaining = function(): number {
  if (!this.isTrial || !this.trialEndDate) return 0;
  const now = new Date();
  const diffTime = this.trialEndDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Static method to get active subscription for user
SubscriptionSchema.statics.getActiveSubscription = function(userId: string) {
  return this.findOne({
    userId,
    status: 'active',
    endDate: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

// Static method to get trial subscription for user
SubscriptionSchema.statics.getTrialSubscription = function(userId: string) {
  return this.findOne({
    userId,
    isTrial: true,
    trialEndDate: { $gt: new Date() }
  }).sort({ createdAt: -1 });
};

const Subscription: Model<ISubscription> = mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', SubscriptionSchema);

export default Subscription;
