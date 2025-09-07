# 🔄 Razorpay Subscriptions Integration

## Overview

This document explains the complete Razorpay Subscriptions integration for the BarberHub SaaS platform. The integration allows salon owners to subscribe to Pro and Pro Plus plans with recurring monthly or yearly billing.

## 🏗️ Architecture

### Subscription Flow
1. **Plan Selection**: User selects Pro or Pro Plus plan with monthly/yearly billing
2. **Plan Creation**: System creates or retrieves Razorpay plan
3. **Subscription Creation**: Creates Razorpay subscription with authentication transaction
4. **Payment Processing**: User completes payment via Razorpay checkout
5. **Webhook Handling**: System processes subscription events via webhooks
6. **Recurring Billing**: Automatic recurring payments based on billing cycle

## 📋 Features Implemented

### ✅ Core Features
- [x] Razorpay Plans creation and management
- [x] Subscription creation with authentication transaction
- [x] Recurring payment setup (monthly/yearly)
- [x] Webhook handling for all subscription events
- [x] Database integration for subscription tracking
- [x] Frontend integration with subscription checkout

### 📊 Subscription Plans
- **Trial Plan**: Free 30-day trial
- **Pro Plan**: ₹29/month or ₹290/year
- **Pro Plus Plan**: ₹49/month or ₹490/year

## 🔧 Technical Implementation

### Database Schema Updates

```typescript
// Added new fields to Subscription model
interface ISubscription {
  razorpaySubscriptionId?: string;  // Razorpay subscription ID
  razorpayPlanId?: string;          // Razorpay plan ID
  // ... existing fields
}
```

### API Endpoints

#### 1. Create Subscription
```
POST /api/subscriptions/create
```
Creates a new Razorpay subscription and returns checkout URL.

**Request Body:**
```json
{
  "plan": "pro" | "pro_plus",
  "billingCycle": "monthly" | "yearly"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscriptionId": "sub_xxxxx",
    "shortUrl": "https://rzp.io/i/xxxxx",
    "planDetails": {
      "plan": "pro",
      "billingCycle": "monthly",
      "amount": 29
    }
  }
}
```

#### 2. Payment Verification
```
POST /api/payments/verify
```
Handles payment verification for both orders and subscriptions.

#### 3. Webhook Handler
```
POST /api/payments/webhook
```
Processes Razorpay webhook events for subscription lifecycle management.

### Webhook Events Handled

| Event | Description | Action |
|-------|-------------|---------|
| `subscription.authenticated` | Customer completed authentication | Update status to 'authenticated' |
| `subscription.activated` | Subscription activated | Update status to 'active', set user role to 'owner' |
| `subscription.charged` | Recurring payment successful | Update last payment date, calculate next payment |
| `subscription.completed` | Subscription completed | Update status to 'completed' |
| `subscription.cancelled` | Subscription cancelled | Update status to 'cancelled' |
| `subscription.halted` | Subscription halted | Update status to 'halted' |
| `subscription.paused` | Subscription paused | Update status to 'paused' |
| `subscription.resumed` | Subscription resumed | Update status to 'active' |

## 🚀 Setup Instructions

### 1. Environment Variables
Add these to your `.env.local`:

```bash
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
RAZORPAY_ENVIRONMENT=test  # or 'live' for production
```

### 2. Razorpay Dashboard Setup
1. **Enable Flash Checkout**:
   - Go to Account & Settings → Flash checkout
   - Enable the Flash Checkout feature

2. **Configure Webhooks**:
   - Go to Settings → Webhooks
   - Add webhook URL: `https://yourdomain.com/api/payments/webhook`
   - Select events:
     - `subscription.authenticated`
     - `subscription.activated`
     - `subscription.charged`
     - `subscription.completed`
     - `subscription.cancelled`
     - `subscription.halted`
     - `subscription.paused`
     - `subscription.resumed`

### 3. Test the Integration
Run the test script:
```bash
node test-razorpay-integration.js
```

## 💳 Payment Flow

### Frontend Integration
```typescript
// User clicks "Get Started" on a plan
const handleSubscribe = async (planId: string) => {
  const response = await fetch('/api/subscriptions/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: planId, billingCycle })
  });
  
  const data = await response.json();
  
  // Redirect to Razorpay checkout
  if (data.data.shortUrl) {
    window.location.href = data.data.shortUrl;
  }
};
```

### Subscription Lifecycle
1. **Created**: Subscription created, waiting for authentication
2. **Authenticated**: Customer completed authentication transaction
3. **Active**: Subscription active, recurring payments enabled
4. **Charged**: Recurring payment processed successfully
5. **Completed/Cancelled**: Subscription ended

## 🔒 Security Features

- **Webhook Signature Verification**: All webhooks are verified using Razorpay signatures
- **Payment Signature Verification**: Payment responses are verified
- **Database Validation**: All subscription data is validated before processing
- **User Authentication**: All API endpoints require user authentication

## 📈 Monitoring & Analytics

### Subscription Status Tracking
- Real-time subscription status updates via webhooks
- Payment history tracking
- Failed payment handling
- Subscription lifecycle monitoring

### Error Handling
- Comprehensive error logging
- Graceful failure handling
- User-friendly error messages
- Automatic retry mechanisms for failed webhooks

## 🧪 Testing

### Test Cards (Razorpay Test Mode)
- **Domestic Visa**: 4718 6091 0820 4366
- **Domestic Mastercard**: 5104 0600 0000 0008
- **International Mastercard**: 5104 0155 5555 5558

### Test Scenarios
1. Create subscription with test card
2. Verify webhook events are received
3. Test subscription cancellation
4. Test failed payment scenarios
5. Test subscription renewal

## 🚨 Troubleshooting

### Common Issues

1. **Flash Checkout Not Enabled**
   - Solution: Enable Flash Checkout in Razorpay dashboard

2. **Webhook Not Receiving Events**
   - Check webhook URL configuration
   - Verify webhook secret
   - Check server logs for errors

3. **Subscription Not Activating**
   - Verify webhook events are being processed
   - Check database for subscription records
   - Verify user authentication

4. **Payment Failures**
   - Check Razorpay dashboard for payment status
   - Verify card details and limits
   - Check webhook event processing

## 📚 Additional Resources

- [Razorpay Subscriptions Documentation](https://razorpay.com/docs/payments/subscriptions/)
- [Razorpay Webhooks Guide](https://razorpay.com/docs/webhooks/)
- [Razorpay API Reference](https://razorpay.com/docs/api/payments/subscriptions/)

## 🎯 Next Steps

1. **Production Deployment**:
   - Switch to live Razorpay keys
   - Update webhook URLs to production domain
   - Test with real payment methods

2. **Enhanced Features**:
   - Subscription upgrade/downgrade
   - Prorated billing
   - Discount codes and offers
   - Invoice management

3. **Analytics & Reporting**:
   - Revenue tracking
   - Subscription metrics
   - Churn analysis
   - Customer lifetime value

---

**Note**: This integration follows Razorpay's best practices and security guidelines. Always test thoroughly in sandbox mode before going live.
