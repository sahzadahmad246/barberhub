import crypto from 'crypto';
import connectDB from './database';
import User from '@/app/models/User';
import Subscription from '@/app/models/Subscription';

/**
 * Razorpay Payment Service
 * Handles subscription creation, payment processing, and webhook handling
 */
export class PaymentService {
  private static readonly RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
  private static readonly RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  private static readonly RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
  private static readonly RAZORPAY_ENVIRONMENT = process.env.RAZORPAY_ENVIRONMENT || 'test';

  /**
   * Get Razorpay base URL based on environment
   */
  private static getRazorpayBaseUrl(): string {
    return 'https://api.razorpay.com/v1';
  }

  /**
   * Create Razorpay plan for subscription
   */
  private static async createRazorpayPlan(planData: {
    period: string;
    interval: number;
    item: {
      name: string;
      amount: number;
      currency: string;
      description: string;
    };
  }) {
    const baseUrl = this.getRazorpayBaseUrl();
    
    console.log('Creating Razorpay plan:', JSON.stringify(planData, null, 2));
    
    const response = await fetch(`${baseUrl}/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.RAZORPAY_KEY_ID}:${this.RAZORPAY_KEY_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify(planData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Razorpay plan creation failed: ${error}`);
    }

    return await response.json();
  }

  /**
   * Create Razorpay subscription
   */
  private static async createRazorpaySubscription(subscriptionData: {
    plan_id: string;
    customer_notify: number;
    total_count: number;
    start_at: number;
    notes?: Record<string, string>;
  }) {
    const baseUrl = this.getRazorpayBaseUrl();
    
    console.log('Creating Razorpay subscription:', JSON.stringify(subscriptionData, null, 2));
    
    const response = await fetch(`${baseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.RAZORPAY_KEY_ID}:${this.RAZORPAY_KEY_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify(subscriptionData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Razorpay subscription creation failed: ${error}`);
    }

    return await response.json();
  }


  /**
   * Create a customer in Razorpay
   */
  static async createCustomer(userId: string, userDetails: { name: string; email: string; phone: string }) {
    const baseUrl = this.getRazorpayBaseUrl();
    
    const customerData = {
      name: userDetails.name,
      email: userDetails.email,
      contact: userDetails.phone || '9999999999',
      fail_existing: '0'
    };
    
    console.log('Creating Razorpay customer:', JSON.stringify(customerData, null, 2));
    
    const response = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.RAZORPAY_KEY_ID}:${this.RAZORPAY_KEY_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify(customerData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Razorpay customer creation failed: ${error}`);
    }

    return await response.json();
  }

  /**
   * Get plan pricing
   */
  private static getPlanPricing(plan: string, billingCycle: string) {
    const prices = {
      pro: {
        monthly: { amount: 2900, duration: 30 * 24 * 60 * 60 * 1000 }, // 30 days in ms
        yearly: { amount: 29000, duration: 365 * 24 * 60 * 60 * 1000 } // 365 days in ms
      },
      'pro-plus': {
        monthly: { amount: 4900, duration: 30 * 24 * 60 * 60 * 1000 },
        yearly: { amount: 49000, duration: 365 * 24 * 60 * 60 * 1000 }
      }
    };

    return prices[plan as keyof typeof prices]?.[billingCycle as keyof typeof prices.pro] || prices.pro.monthly;
  }

  /**
   * Create a paid subscription
   */
  static async createSubscription(userId: string, plan: string, billingCycle: string) {
    try {
      await connectDB();

      // Check if user already has an active subscription
      const existingSubscription = await Subscription.findOne({
        userId,
        status: { $in: ['active', 'pending'] }
      });

      if (existingSubscription) {
        throw new Error('User already has an active subscription');
      }

      // Get user details
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Create customer in Razorpay
      const customer = await this.createCustomer(userId, {
        name: user.name,
        email: user.email,
        phone: '9999999999' // Default phone number for Razorpay requirement
      });

      // Calculate pricing
      const pricing = this.getPlanPricing(plan, billingCycle);
      
      // Create Razorpay plan first
      const razorpayPlan = await this.createRazorpayPlan({
        period: billingCycle === 'monthly' ? 'monthly' : 'yearly',
        interval: 1,
        item: {
          name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
          amount: pricing.amount * 100, // Amount in paise
          currency: 'INR',
          description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} subscription plan (${billingCycle})`
        }
      });

      // Create Razorpay subscription
      const razorpaySubscription = await this.createRazorpaySubscription({
        plan_id: razorpayPlan.id,
        customer_notify: 1,
        total_count: billingCycle === 'monthly' ? 12 : 1, // 12 months for monthly, 1 year for yearly
        start_at: Math.floor(Date.now() / 1000), // Current timestamp
        notes: {
          plan,
          billingCycle,
          userId,
          customer_id: customer.id
        }
      });
      
      // Return subscription details for Razorpay checkout
      return {
        subscription: razorpaySubscription,
        customer: customer,
        razorpayKeyId: this.RAZORPAY_KEY_ID,
        subscriptionId: razorpaySubscription.id,
        amount: pricing.amount * 100,
        currency: 'INR',
        name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} subscription plan (${billingCycle})`,
        customerName: user.name,
        customerEmail: user.email,
        customerContact: '9999999999',
        // Store plan details for later use
        planDetails: {
          plan,
          billingCycle,
          userId,
          amount: pricing.amount,
          duration: pricing.duration
        }
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw new Error('Failed to create subscription');
    }
  }

  /**
   * Create a trial subscription (free)
   */
  static async createTrialSubscription(userId: string) {
    try {
      await connectDB();

      // Check if user already has a subscription
      const existingSubscription = await Subscription.findOne({ userId });
      if (existingSubscription) {
        throw new Error('User already has a subscription');
      }

      // Create trial subscription
      const trialDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
      const dbSubscription = new Subscription({
        userId,
        plan: 'trial',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + trialDuration),
        amount: 0,
        billingCycle: 'monthly',
        isTrial: true
      });

      await dbSubscription.save();
      
      return {
        subscription: dbSubscription,
        message: 'Trial subscription created successfully'
      };
    } catch (error) {
      console.error('Error creating trial subscription:', error);
      throw new Error('Failed to create trial subscription');
    }
  }

  /**
   * Verify Razorpay payment signature
   */
  static verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!this.RAZORPAY_KEY_SECRET) {
      console.warn('Razorpay key secret not configured');
      return false;
    }

    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', this.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Verify Razorpay webhook signature
   */
  static verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.RAZORPAY_WEBHOOK_SECRET) {
      console.warn('Razorpay webhook secret not configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Activate subscription after successful payment
   */
  static async activateSubscription(userId: string, subscriptionId: string, paymentId: string) {
    try {
      await connectDB();

      // Get subscription details from Razorpay to extract plan information
      const baseUrl = this.getRazorpayBaseUrl();
      const subscriptionResponse = await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.RAZORPAY_KEY_ID}:${this.RAZORPAY_KEY_SECRET}`).toString('base64')}`
        }
      });

      if (!subscriptionResponse.ok) {
        throw new Error('Failed to fetch subscription details from Razorpay');
      }

      const subscriptionData = await subscriptionResponse.json();
      const notes = subscriptionData.notes || {};

      // Check if subscription already exists (prevent duplicates)
      const existingSubscription = await Subscription.findOne({
        razorpayOrderId: subscriptionId, // Store subscription ID in orderId field
        userId
      });

      if (existingSubscription) {
        // Update existing subscription
        existingSubscription.status = 'active';
        existingSubscription.razorpayPaymentId = paymentId;
        await existingSubscription.save();
        
        // Update user role to owner
        await User.findByIdAndUpdate(userId, { role: 'owner' });

        return {
          subscription: existingSubscription,
          message: 'Subscription activated successfully'
        };
      }

      // Create new subscription from subscription details
      const pricing = this.getPlanPricing(notes.plan, notes.billingCycle);
      
      const subscription = new Subscription({
        userId: notes.userId,
        plan: notes.plan,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + pricing.duration),
        amount: pricing.amount,
        billingCycle: notes.billingCycle,
        razorpayOrderId: subscriptionId, // Store subscription ID in orderId field
        razorpayCustomerId: notes.customer_id,
        razorpayPaymentId: paymentId,
        isTrial: false
      });

      await subscription.save();

      // Update user role to owner
      await User.findByIdAndUpdate(userId, { role: 'owner' });

      return {
        subscription,
        message: 'Subscription created and activated successfully'
      };
    } catch (error) {
      console.error('Error activating subscription:', error);
      throw new Error('Failed to activate subscription');
    }
  }

  /**
   * Handle Razorpay webhook events
   */
  static async handleWebhook(event: { event: string; payload: { payment?: { entity: { order_id: string; id: string } }; order?: { entity: { id: string } } } }) {
    try {
      await connectDB();

      const { event: eventType, payload } = event;

      switch (eventType) {
        case 'payment.captured':
          if (payload.payment?.entity) {
            await this.handlePaymentCaptured(payload.payment.entity);
          }
          break;
        case 'payment.failed':
          if (payload.payment?.entity) {
            await this.handlePaymentFailed(payload.payment.entity);
          }
          break;
        case 'order.paid':
          if (payload.order?.entity) {
            await this.handleOrderPaid(payload.order.entity);
          }
          break;
        default:
          console.log(`Unhandled webhook event: ${eventType}`);
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment capture
   */
  private static async handlePaymentCaptured(payment: { order_id: string; id: string }) {
    const subscription = await Subscription.findOne({
      razorpayOrderId: payment.order_id
    });

    if (subscription) {
      subscription.status = 'active';
      subscription.razorpayPaymentId = payment.id;
      await subscription.save();

      // Update user role to owner
      await User.findByIdAndUpdate(subscription.userId, { role: 'owner' });
      
      console.log(`Subscription activated for user ${subscription.userId}`);
    }
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(payment: { order_id: string }) {
    const subscription = await Subscription.findOne({
      razorpayOrderId: payment.order_id
    });

    if (subscription) {
      subscription.status = 'failed';
      await subscription.save();
      
      console.log(`Payment failed for subscription ${subscription._id}`);
    }
  }

  /**
   * Handle order paid event
   */
  private static async handleOrderPaid(order: { id: string }) {
    const subscription = await Subscription.findOne({
      razorpayOrderId: order.id
    });

    if (subscription) {
      subscription.status = 'active';
      await subscription.save();

      // Update user role to owner
      await User.findByIdAndUpdate(subscription.userId, { role: 'owner' });
      
      console.log(`Order paid for subscription ${subscription._id}`);
    }
  }


  /**
   * Get subscription status
   */
  static async getSubscriptionStatus(userId: string) {
    try {
      await connectDB();
      
      const subscription = await Subscription.findOne({ userId });
      
      if (!subscription) {
        return { hasSubscription: false };
      }

      // Check if subscription has valid data
      if (!subscription.plan || !subscription.status) {
        console.log('Found invalid subscription, cleaning up...');
        await Subscription.deleteOne({ _id: subscription._id });
        return { hasSubscription: false };
      }

      return {
        hasSubscription: true,
        subscription: {
          id: subscription._id,
          plan: subscription.plan,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          amount: subscription.amount,
          billingCycle: subscription.billingCycle,
          isTrial: subscription.isTrial,
          razorpayOrderId: subscription.razorpayOrderId
        }
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw new Error('Failed to get subscription status');
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId: string) {
    try {
      await connectDB();
      
      const subscription = await Subscription.findOne({ userId });
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.razorpayOrderId) {
        // Cancel Razorpay subscription
        const baseUrl = this.getRazorpayBaseUrl();
        const response = await fetch(`${baseUrl}/subscriptions/${subscription.razorpayOrderId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${this.RAZORPAY_KEY_ID}:${this.RAZORPAY_KEY_SECRET}`).toString('base64')}`
          }
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to cancel Razorpay subscription: ${error}`);
        }
      }

      // Update subscription status
      subscription.status = 'cancelled';
      await subscription.save();

      return { message: 'Subscription cancelled successfully' };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Pause subscription
   */
  static async pauseSubscription(userId: string) {
    try {
      await connectDB();
      
      const subscription = await Subscription.findOne({ userId });
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.razorpayOrderId) {
        // Pause Razorpay subscription
        const baseUrl = this.getRazorpayBaseUrl();
        const response = await fetch(`${baseUrl}/subscriptions/${subscription.razorpayOrderId}/pause`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${this.RAZORPAY_KEY_ID}:${this.RAZORPAY_KEY_SECRET}`).toString('base64')}`
          },
          body: JSON.stringify({
            pause_at: 'now'
          })
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to pause Razorpay subscription: ${error}`);
        }
      }

      // Update subscription status
      subscription.status = 'paused';
      await subscription.save();

      return { message: 'Subscription paused successfully' };
    } catch (error) {
      console.error('Error pausing subscription:', error);
      throw new Error('Failed to pause subscription');
    }
  }

  /**
   * Resume subscription
   */
  static async resumeSubscription(userId: string) {
    try {
      await connectDB();
      
      const subscription = await Subscription.findOne({ userId });
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.razorpayOrderId) {
        // Resume Razorpay subscription
        const baseUrl = this.getRazorpayBaseUrl();
        const response = await fetch(`${baseUrl}/subscriptions/${subscription.razorpayOrderId}/resume`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${this.RAZORPAY_KEY_ID}:${this.RAZORPAY_KEY_SECRET}`).toString('base64')}`
          }
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to resume Razorpay subscription: ${error}`);
        }
      }

      // Update subscription status
      subscription.status = 'active';
      await subscription.save();

      return { message: 'Subscription resumed successfully' };
    } catch (error) {
      console.error('Error resuming subscription:', error);
      throw new Error('Failed to resume subscription');
    }
  }
}