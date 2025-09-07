import crypto from 'crypto';
import Razorpay from 'razorpay';
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
   * Get Razorpay instance
   */
  private static getRazorpayInstance(): Razorpay {
    if (!this.RAZORPAY_KEY_ID || !this.RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }
    
    return new Razorpay({
      key_id: this.RAZORPAY_KEY_ID,
      key_secret: this.RAZORPAY_KEY_SECRET
    });
  }

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
    period: 'monthly' | 'yearly' | 'daily' | 'weekly';
    interval: number;
    item: {
      name: string;
      amount: number;
      currency: string;
      description: string;
    };
    notes?: Record<string, string>;
  }) {
    const razorpay = this.getRazorpayInstance();
    
    console.log('Creating Razorpay plan:', JSON.stringify(planData, null, 2));
    
    try {
      const plan = await razorpay.plans.create(planData);
      console.log('Plan created successfully:', plan.id);
      return plan;
    } catch (error: unknown) {
      console.error('Razorpay plan creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Razorpay plan creation failed: ${errorMessage}`);
    }
  }

  /**
   * Get or create Razorpay plan for subscription
   */
  private static async getOrCreateRazorpayPlan(plan: string, billingCycle: string) {
    const pricing = this.getPlanPricing(plan, billingCycle);
    const razorpay = this.getRazorpayInstance();
    
    // Try to fetch existing plan first
    try {
      const plans = await razorpay.plans.all();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingPlan = plans.items?.find((p: any) => 
        p.item.name.includes(plan.charAt(0).toUpperCase() + plan.slice(1)) &&
        p.period === (billingCycle === 'monthly' ? 'monthly' : 'yearly') &&
        Number(p.item.amount) === pricing.amount * 100
      );
      
      if (existingPlan) {
        console.log(`Found existing plan: ${existingPlan.id}`);
        return existingPlan;
      }
    } catch (error) {
      console.log('Error fetching existing plans, creating new one:', error);
    }

    // Create new plan if not found
    const planData = {
      period: (billingCycle === 'monthly' ? 'monthly' : 'yearly') as 'monthly' | 'yearly',
      interval: 1,
      item: {
        name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}`,
        amount: pricing.amount * 100, // Amount in paise
        currency: 'INR',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} subscription plan billed ${billingCycle}`
      },
      notes: {
        plan_type: plan,
        billing_cycle: billingCycle,
        created_by: 'barberhub_saas'
      }
    };

    return await this.createRazorpayPlan(planData);
  }

  /**
   * Create Razorpay order for first payment
   */
  private static async createRazorpayOrder(orderData: {
    amount: number;
    currency: string;
    receipt: string;
    notes: Record<string, string>;
  }) {
    const baseUrl = this.getRazorpayBaseUrl();
    
    console.log('Creating Razorpay order:', JSON.stringify(orderData, null, 2));
    
    const response = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.RAZORPAY_KEY_ID}:${this.RAZORPAY_KEY_SECRET}`).toString('base64')}`
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Razorpay order creation failed: ${error}`);
    }

    return await response.json();
  }

  /**
   * Create Razorpay subscription
   */
  private static async createRazorpaySubscription(subscriptionData: {
    plan_id: string;
    customer_notify: boolean;
    total_count: number;
    start_at?: number;
    notes?: Record<string, string>;
  }) {
    const razorpay = this.getRazorpayInstance();
    
    console.log('Creating Razorpay subscription:', JSON.stringify(subscriptionData, null, 2));
    
    try {
      const subscription = await razorpay.subscriptions.create(subscriptionData);
      console.log('Subscription created successfully:', subscription.id);
      return subscription;
    } catch (error: unknown) {
      console.error('Razorpay subscription creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Razorpay subscription creation failed: ${errorMessage}`);
    }
  }


  /**
   * Create a customer in Razorpay
   */
  static async createCustomer(userId: string, userDetails: { name: string; email: string; phone: string }) {
    const razorpay = this.getRazorpayInstance();
    
    const customerData = {
      name: userDetails.name,
      email: userDetails.email,
      contact: userDetails.phone || '9999999999',
      fail_existing: 0 as const
    };
    
    console.log('Creating Razorpay customer:', JSON.stringify(customerData, null, 2));
    
    try {
      const customer = await razorpay.customers.create(customerData);
      console.log('Customer created successfully:', customer.id);
      return customer;
    } catch (error: unknown) {
      console.error('Razorpay customer creation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Razorpay customer creation failed: ${errorMessage}`);
    }
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
   * Create a paid subscription using Razorpay Subscriptions
   */
  static async createSubscription(userId: string, plan: string, billingCycle: string, startDate?: Date) {
    try {
      await connectDB();

      // Check if user already has an active subscription
      const existingSubscription = await Subscription.findOne({
        userId,
        status: { $in: ['active', 'pending', 'created', 'authenticated'] }
      });

      if (existingSubscription) {
        throw new Error('User already has an active subscription');
      }

      // If startDate is provided, check if it's in the future
      if (startDate && startDate <= new Date()) {
        throw new Error('Start date must be in the future');
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

      // Get or create Razorpay plan
      const razorpayPlan = await this.getOrCreateRazorpayPlan(plan, billingCycle);
      
      // Create Razorpay subscription
      const subscriptionData: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
        plan_id: razorpayPlan.id,
        customer_notify: true,
        total_count: billingCycle === 'yearly' ? 1 : 12, // 1 year for yearly, 12 months for monthly
        notes: {
          plan,
          billingCycle,
          userId,
          customer_id: customer.id,
          type: 'subscription'
        }
      };

      // Add start_at if provided
      if (startDate) {
        subscriptionData.start_at = Math.floor(startDate.getTime() / 1000);
      }

      const razorpaySubscription = await this.createRazorpaySubscription(subscriptionData);

      // Create a temporary subscription record to track the creation
      // This will be updated when we receive webhook confirmation
      const tempSubscription = new Subscription({
        userId,
        plan,
        status: 'created',
        startDate: new Date(),
        endDate: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
        amount: this.getPlanPricing(plan, billingCycle).amount,
        billingCycle,
        razorpayCustomerId: customer.id,
        razorpaySubscriptionId: razorpaySubscription.id,
        razorpayPlanId: razorpayPlan.id,
        isTrial: false
      });

      await tempSubscription.save();
      
      // Return subscription details for Razorpay checkout
      return {
        subscription: razorpaySubscription,
        customer: customer,
        razorpayKeyId: this.RAZORPAY_KEY_ID,
        subscriptionId: razorpaySubscription.id,
        shortUrl: razorpaySubscription.short_url,
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
          amount: this.getPlanPricing(plan, billingCycle).amount,
          razorpayPlanId: razorpayPlan.id
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
  static async activateSubscription(userId: string, orderId: string, paymentId: string) {
    try {
      await connectDB();

      // Get order details from Razorpay to extract plan information
      const baseUrl = this.getRazorpayBaseUrl();
      const orderResponse = await fetch(`${baseUrl}/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.RAZORPAY_KEY_ID}:${this.RAZORPAY_KEY_SECRET}`).toString('base64')}`
        }
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to fetch order details from Razorpay');
      }

      const orderData = await orderResponse.json();
      const notes = orderData.notes || {};

      // Check if subscription already exists (prevent duplicates)
      const existingSubscription = await Subscription.findOne({
        razorpayOrderId: orderId,
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

      // Create new subscription from order details
      const pricing = this.getPlanPricing(notes.plan, notes.billingCycle);
      
      const subscription = new Subscription({
        userId: notes.userId,
        plan: notes.plan,
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + pricing.duration),
        amount: pricing.amount,
        billingCycle: notes.billingCycle,
        razorpayOrderId: orderId, // Store order ID
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
   * Activate subscription by subscription ID (for webhook handling)
   */
  static async activateSubscriptionBySubscriptionId(userId: string, subscriptionId: string) {
    try {
      await connectDB();

      const subscription = await Subscription.findOne({
        userId,
        razorpaySubscriptionId: subscriptionId
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      subscription.status = 'active';
      subscription.lastPaymentDate = new Date();
      
      // Calculate next payment date
      const nextPaymentDate = new Date();
      if (subscription.billingCycle === 'monthly') {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      } else {
        nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
      }
      subscription.nextPaymentDate = nextPaymentDate;

      await subscription.save();

      // Update user role to owner
      await User.findByIdAndUpdate(userId, { role: 'owner' });

      return {
        subscription: {
          id: subscription._id,
          plan: subscription.plan,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          amount: subscription.amount,
          billingCycle: subscription.billingCycle,
          isTrial: subscription.isTrial
        }
      };
    } catch (error) {
      console.error('Error activating subscription:', error);
      throw new Error('Failed to activate subscription');
    }
  }

  /**
   * Handle Razorpay webhook events
   */
  static async handleWebhook(event: { event: string; payload: { payment?: { entity: { order_id: string; id: string } }; order?: { entity: { id: string } }; subscription?: { entity: { id: string; status: string; customer_id: string; plan_id?: string; notes?: Record<string, unknown> } } } }) {
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
        case 'subscription.authenticated':
          if (payload.subscription?.entity) {
            await this.handleSubscriptionAuthenticated({
              id: payload.subscription.entity.id,
              customer_id: payload.subscription.entity.customer_id,
              plan_id: payload.subscription.entity.plan_id || '',
              notes: payload.subscription.entity.notes || {}
            });
          }
          break;
        case 'subscription.activated':
          if (payload.subscription?.entity) {
            await this.handleSubscriptionActivated(payload.subscription.entity);
          }
          break;
        case 'subscription.charged':
          if (payload.subscription?.entity) {
            await this.handleSubscriptionCharged(payload.subscription.entity);
          }
          break;
        case 'subscription.completed':
          if (payload.subscription?.entity) {
            await this.handleSubscriptionCompleted(payload.subscription.entity);
          }
          break;
        case 'subscription.cancelled':
          if (payload.subscription?.entity) {
            await this.handleSubscriptionCancelled(payload.subscription.entity);
          }
          break;
        case 'subscription.halted':
          if (payload.subscription?.entity) {
            await this.handleSubscriptionHalted(payload.subscription.entity);
          }
          break;
        case 'subscription.paused':
          if (payload.subscription?.entity) {
            await this.handleSubscriptionPaused(payload.subscription.entity);
          }
          break;
        case 'subscription.resumed':
          if (payload.subscription?.entity) {
            await this.handleSubscriptionResumed(payload.subscription.entity);
          }
          break;
        case 'subscription.failed':
          if (payload.subscription?.entity) {
            await this.handleSubscriptionFailed(payload.subscription.entity);
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
   * Handle subscription authenticated event
   */
  private static async handleSubscriptionAuthenticated(subscription: { id: string; customer_id: string; plan_id: string; notes: Record<string, unknown> }) {
    try {
      // Check if subscription already exists in database
      let dbSubscription = await Subscription.findOne({
        razorpaySubscriptionId: subscription.id
      });

      if (!dbSubscription) {
        // Create new subscription record from webhook data
        const notes = subscription.notes || {};
        const plan = (notes.plan as string) || 'pro';
        const billingCycle = (notes.billingCycle as string) || 'monthly';
        const userId = notes.userId as string;

        if (!userId) {
          console.error('No userId found in subscription notes:', subscription.id);
          return;
        }

        // Get plan pricing
        const pricing = this.getPlanPricing(plan, billingCycle);

        dbSubscription = new Subscription({
          userId,
          plan,
          status: 'authenticated',
          startDate: new Date(),
          endDate: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
          amount: pricing.amount,
          billingCycle,
          razorpayCustomerId: subscription.customer_id,
          razorpaySubscriptionId: subscription.id,
          razorpayPlanId: subscription.plan_id,
          isTrial: false
        });

        await dbSubscription.save();
        console.log(`New subscription created and authenticated: ${subscription.id}`);
      } else {
        // Update existing subscription
        dbSubscription.status = 'authenticated';
        await dbSubscription.save();
        console.log(`Existing subscription authenticated: ${subscription.id}`);
      }
    } catch (error) {
      console.error('Error handling subscription authenticated:', error);
    }
  }

  /**
   * Handle subscription activated event
   */
  private static async handleSubscriptionActivated(subscription: { id: string; customer_id: string }) {
    const dbSubscription = await Subscription.findOne({
      razorpaySubscriptionId: subscription.id
    });

    if (dbSubscription) {
      dbSubscription.status = 'active';
      await dbSubscription.save();

      // Update user role to owner
      await User.findByIdAndUpdate(dbSubscription.userId, { role: 'owner' });
      
      console.log(`Subscription activated: ${subscription.id}`);
    }
  }

  /**
   * Handle subscription charged event
   */
  private static async handleSubscriptionCharged(subscription: { id: string; customer_id: string }) {
    const dbSubscription = await Subscription.findOne({
      razorpaySubscriptionId: subscription.id
    });

    if (dbSubscription) {
      dbSubscription.lastPaymentDate = new Date();
      // Calculate next payment date based on billing cycle
      const nextPaymentDate = new Date();
      if (dbSubscription.billingCycle === 'monthly') {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      } else {
        nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
      }
      dbSubscription.nextPaymentDate = nextPaymentDate;
      await dbSubscription.save();
      
      console.log(`Subscription charged: ${subscription.id}`);
    }
  }

  /**
   * Handle subscription completed event
   */
  private static async handleSubscriptionCompleted(subscription: { id: string; customer_id: string }) {
    const dbSubscription = await Subscription.findOne({
      razorpaySubscriptionId: subscription.id
    });

    if (dbSubscription) {
      dbSubscription.status = 'completed';
      await dbSubscription.save();
      
      console.log(`Subscription completed: ${subscription.id}`);
    }
  }

  /**
   * Handle subscription cancelled event
   */
  private static async handleSubscriptionCancelled(subscription: { id: string; customer_id: string }) {
    const dbSubscription = await Subscription.findOne({
      razorpaySubscriptionId: subscription.id
    });

    if (dbSubscription) {
      dbSubscription.status = 'cancelled';
      await dbSubscription.save();
      
      console.log(`Subscription cancelled: ${subscription.id}`);
    }
  }

  /**
   * Handle subscription halted event
   */
  private static async handleSubscriptionHalted(subscription: { id: string; customer_id: string }) {
    const dbSubscription = await Subscription.findOne({
      razorpaySubscriptionId: subscription.id
    });

    if (dbSubscription) {
      dbSubscription.status = 'halted';
      await dbSubscription.save();
      
      console.log(`Subscription halted: ${subscription.id}`);
    }
  }

  /**
   * Handle subscription paused event
   */
  private static async handleSubscriptionPaused(subscription: { id: string; customer_id: string }) {
    const dbSubscription = await Subscription.findOne({
      razorpaySubscriptionId: subscription.id
    });

    if (dbSubscription) {
      dbSubscription.status = 'paused';
      await dbSubscription.save();
      
      console.log(`Subscription paused: ${subscription.id}`);
    }
  }

  /**
   * Handle subscription resumed event
   */
  private static async handleSubscriptionResumed(subscription: { id: string; customer_id: string }) {
    const dbSubscription = await Subscription.findOne({
      razorpaySubscriptionId: subscription.id
    });

    if (dbSubscription) {
      dbSubscription.status = 'active';
      await dbSubscription.save();
      
      console.log(`Subscription resumed: ${subscription.id}`);
    }
  }

  /**
   * Handle subscription failed event
   */
  private static async handleSubscriptionFailed(subscription: { id: string; customer_id: string }) {
    const dbSubscription = await Subscription.findOne({
      razorpaySubscriptionId: subscription.id
    });

    if (dbSubscription) {
      dbSubscription.status = 'failed';
      await dbSubscription.save();
      
      console.log(`Subscription failed: ${subscription.id}`);
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

      // If we have a Razorpay subscription ID, sync with Razorpay
      if (subscription.razorpaySubscriptionId) {
        try {
          await this.syncSubscriptionWithRazorpay(subscription);
        } catch (error) {
          console.error('Error syncing subscription with Razorpay:', error);
        }
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
          razorpayOrderId: subscription.razorpayOrderId,
          razorpaySubscriptionId: subscription.razorpaySubscriptionId,
          cancelledAt: subscription.cancelledAt,
          cancelledBy: subscription.cancelledBy,
          cancelAtCycleEnd: subscription.cancelAtCycleEnd,
          benefitsEndDate: subscription.benefitsEndDate,
          hasActiveBenefits: (subscription as any).hasActiveBenefits // eslint-disable-line @typescript-eslint/no-explicit-any
        }
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      throw new Error('Failed to get subscription status');
    }
  }

  /**
   * Sync subscription status with Razorpay
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async syncSubscriptionWithRazorpay(dbSubscription: any) {
    try {
      if (!dbSubscription.razorpaySubscriptionId) {
        throw new Error('No Razorpay subscription ID found');
      }
      
      const razorpay = this.getRazorpayInstance();
      const razorpaySubscription = await razorpay.subscriptions.fetch(dbSubscription.razorpaySubscriptionId);
      
      // Update database subscription with latest status from Razorpay
      if (razorpaySubscription.status !== dbSubscription.status) {
        dbSubscription.status = razorpaySubscription.status;
        await dbSubscription.save();
        console.log(`Synced subscription status: ${dbSubscription.razorpaySubscriptionId} -> ${razorpaySubscription.status}`);
      }
    } catch (error) {
      console.error('Error syncing subscription with Razorpay:', error);
    }
  }

  /**
   * Get Razorpay subscription management URL
   */
  static async getSubscriptionManagementUrl(userId: string) {
    try {
      await connectDB();
      
      const subscription = await Subscription.findOne({ 
        userId,
        razorpaySubscriptionId: { $exists: true }
      });
      
      if (!subscription || !subscription.razorpaySubscriptionId) {
        throw new Error('No Razorpay subscription found');
      }

      const razorpay = this.getRazorpayInstance();
      const razorpaySubscription = await razorpay.subscriptions.fetch(subscription.razorpaySubscriptionId);
      
      return {
        shortUrl: razorpaySubscription.short_url,
        subscriptionId: subscription.razorpaySubscriptionId,
        status: razorpaySubscription.status
      };
    } catch (error) {
      console.error('Error getting subscription management URL:', error);
      throw new Error('Failed to get subscription management URL');
    }
  }

  /**
   * Upgrade or downgrade subscription using Razorpay update API
   */
  static async changeSubscriptionPlan(userId: string, newPlan: string, newBillingCycle: string) {
    try {
      await connectDB();
      
      const currentSubscription = await Subscription.findOne({ 
        userId,
        status: { $in: ['active', 'authenticated', 'created'] }
      });
      
      if (!currentSubscription) {
        throw new Error('No subscription found for user');
      }

      if (!currentSubscription.razorpaySubscriptionId) {
        throw new Error('No Razorpay subscription ID found. Please contact support.');
      }

      // Get new plan pricing
      const newPricing = this.getPlanPricing(newPlan, newBillingCycle);
      
      // Get or create new Razorpay plan
      const newRazorpayPlan = await this.getOrCreateRazorpayPlan(newPlan, newBillingCycle);
      
      // Update existing subscription using Razorpay API
      const razorpay = this.getRazorpayInstance();
      const updatedSubscription = await razorpay.subscriptions.update(
        currentSubscription.razorpaySubscriptionId,
        {
          plan_id: newRazorpayPlan.id,
          schedule_change_at: 'cycle_end', // Change at end of current cycle
          customer_notify: true
        }
      );

      // Update database subscription
      currentSubscription.plan = newPlan as 'pro' | 'pro_plus';
      currentSubscription.billingCycle = newBillingCycle as 'monthly' | 'yearly';
      currentSubscription.amount = newPricing.amount;
      currentSubscription.razorpayPlanId = newRazorpayPlan.id;
      currentSubscription.status = updatedSubscription.status;
      await currentSubscription.save();

      return {
        subscription: updatedSubscription,
        planDetails: {
          plan: newPlan,
          billingCycle: newBillingCycle,
          amount: newPricing.amount
        },
        message: 'Subscription plan will be updated at the end of current billing cycle'
      };
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      throw new Error('Failed to change subscription plan');
    }
  }

  /**
   * Cancel subscription using Razorpay API
   */
  static async cancelSubscription(userId: string, cancelAtCycleEnd: boolean = false) {
    try {
      await connectDB();
      
      const subscription = await Subscription.findOne({ 
        userId,
        razorpaySubscriptionId: { $exists: true }
      });
      
      if (!subscription || !subscription.razorpaySubscriptionId) {
        throw new Error('No Razorpay subscription found');
      }

      const razorpay = this.getRazorpayInstance();
      
      // Cancel subscription using Razorpay API
      const cancelledSubscription = await razorpay.subscriptions.cancel(
        subscription.razorpaySubscriptionId,
        cancelAtCycleEnd
      );

      // Update database subscription
      subscription.status = cancelledSubscription.status;
      if (cancelledSubscription.ended_at) {
        subscription.endDate = new Date(cancelledSubscription.ended_at * 1000);
      }
      await subscription.save();

      return { 
        message: cancelAtCycleEnd 
          ? 'Subscription will be cancelled at the end of current billing cycle' 
          : 'Subscription cancelled successfully',
        subscription: cancelledSubscription
      };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Pause subscription using Razorpay API
   */
  static async pauseSubscription(userId: string) {
    try {
      await connectDB();
      
      const subscription = await Subscription.findOne({ 
        userId,
        razorpaySubscriptionId: { $exists: true }
      });
      
      if (!subscription || !subscription.razorpaySubscriptionId) {
        throw new Error('No Razorpay subscription found');
      }

      const razorpay = this.getRazorpayInstance();
      
      // Pause subscription using Razorpay API
      const pausedSubscription = await razorpay.subscriptions.pause(
        subscription.razorpaySubscriptionId,
        { pause_at: 'now' }
      );

      // Update database subscription
      subscription.status = pausedSubscription.status;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((pausedSubscription as any).paused_at) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscription.pausedAt = new Date((pausedSubscription as any).paused_at * 1000);
      }
      await subscription.save();

      return { 
        message: 'Subscription paused successfully',
        subscription: pausedSubscription
      };
    } catch (error) {
      console.error('Error pausing subscription:', error);
      throw new Error('Failed to pause subscription');
    }
  }

  /**
   * Resume subscription using Razorpay API
   */
  static async resumeSubscription(userId: string) {
    try {
      await connectDB();
      
      const subscription = await Subscription.findOne({ 
        userId,
        razorpaySubscriptionId: { $exists: true }
      });
      
      if (!subscription || !subscription.razorpaySubscriptionId) {
        throw new Error('No Razorpay subscription found');
      }

      const razorpay = this.getRazorpayInstance();
      
      // Resume subscription using Razorpay API
      const resumedSubscription = await razorpay.subscriptions.resume(
        subscription.razorpaySubscriptionId,
        { resume_at: 'now' }
      );

      // Update database subscription
      subscription.status = resumedSubscription.status;
      subscription.pausedAt = undefined; // Clear paused date
      await subscription.save();

      return { 
        message: 'Subscription resumed successfully',
        subscription: resumedSubscription
      };
    } catch (error) {
      console.error('Error resuming subscription:', error);
      throw new Error('Failed to resume subscription');
    }
  }

  /**
   * Create subscription after cancelled one ends
   */
  static async createSubscriptionAfterCancelled(userId: string, plan: string, billingCycle: string) {
    try {
      await connectDB();
      
      // Find the most recent cancelled subscription
      const cancelledSubscription = await Subscription.findOne({ 
        userId,
        status: 'cancelled'
      }).sort({ cancelledAt: -1 });
      
      if (!cancelledSubscription) {
        // No cancelled subscription, create normally
        return await this.createSubscription(userId, plan, billingCycle);
      }

      // Check if benefits have ended
      const now = new Date();
      const benefitsEndDate = cancelledSubscription.benefitsEndDate || cancelledSubscription.endDate;
      
      if (benefitsEndDate <= now) {
        // Benefits have ended, create subscription starting now
        return await this.createSubscription(userId, plan, billingCycle);
      } else {
        // Benefits still active, create subscription starting after benefits end
        const startDate = new Date(benefitsEndDate);
        startDate.setDate(startDate.getDate() + 1); // Start the day after benefits end
        
        return await this.createSubscription(userId, plan, billingCycle, startDate);
      }
    } catch (error) {
      console.error('Error creating subscription after cancelled:', error);
      throw new Error('Failed to create subscription');
    }
  }

  /**
   * Update subscription using Razorpay API
   */
  static async updateSubscription(userId: string, updateData: {
    plan_id?: string;
    quantity?: number;
    remaining_count?: number;
    schedule_change_at?: 'now' | 'cycle_end';
    customer_notify?: boolean;
  }) {
    try {
      await connectDB();
      
      const subscription = await Subscription.findOne({ 
        userId,
        razorpaySubscriptionId: { $exists: true }
      });
      
      if (!subscription || !subscription.razorpaySubscriptionId) {
        throw new Error('No Razorpay subscription found');
      }

      const razorpay = this.getRazorpayInstance();
      
      // Update subscription using Razorpay API
      const updatedSubscription = await razorpay.subscriptions.update(
        subscription.razorpaySubscriptionId,
        updateData
      );

      // Update database subscription
      if (updateData.plan_id) {
        subscription.razorpayPlanId = updateData.plan_id;
      }
      subscription.status = updatedSubscription.status;
      await subscription.save();

      return { 
        message: 'Subscription updated successfully',
        subscription: updatedSubscription
      };
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw new Error('Failed to update subscription');
    }
  }

  /**
   * Get subscription invoices using Razorpay API
   */
  static async getSubscriptionInvoices(userId: string) {
    try {
      await connectDB();
      
      const subscription = await Subscription.findOne({ 
        userId,
        razorpaySubscriptionId: { $exists: true }
      });
      
      if (!subscription || !subscription.razorpaySubscriptionId) {
        throw new Error('No Razorpay subscription found');
      }

      const razorpay = this.getRazorpayInstance();
      
      // Get invoices using Razorpay API
      const invoices = await razorpay.invoices.all({
        subscription_id: subscription.razorpaySubscriptionId
      });

      return { 
        invoices: invoices.items,
        count: invoices.count
      };
    } catch (error) {
      console.error('Error fetching subscription invoices:', error);
      throw new Error('Failed to fetch subscription invoices');
    }
  }
}