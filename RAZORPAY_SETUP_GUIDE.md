# 🚨 Razorpay Setup Issues & Solutions

## ❌ **Current Issue Identified**

You have **LIVE Razorpay keys** but your environment is set to **TEST**. This mismatch is causing the payment failure.

### **Your Current Configuration:**
- **RAZORPAY_KEY_ID**: `rzp_live_RDbOAEZcZNKpVr` (LIVE key)
- **RAZORPAY_ENVIRONMENT**: `test` (TEST environment)

## 🔧 **Solutions**

### **Option 1: Use Test Keys (Recommended for Development)**

1. **Get Test Keys from Razorpay Dashboard:**
   - Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
   - Switch to **Test Mode** (toggle in top right)
   - Go to **Settings** → **API Keys**
   - Copy your **Test Key ID** and **Test Key Secret**

2. **Update your `.env.local`:**
   ```bash
   RAZORPAY_KEY_ID=rzp_test_your_test_key_id
   RAZORPAY_KEY_SECRET=your_test_key_secret
   RAZORPAY_ENVIRONMENT=test
   ```

### **Option 2: Use Live Keys (For Production)**

1. **Update your `.env.local`:**
   ```bash
   RAZORPAY_KEY_ID=rzp_live_RDbOAEZcZNKpVr
   RAZORPAY_KEY_SECRET=your_live_key_secret
   RAZORPAY_ENVIRONMENT=live
   ```

## 🎯 **Required Razorpay Dashboard Setup**

### **1. Enable Flash Checkout (CRITICAL)**
- Go to **Account & Settings** → **Flash checkout**
- **Enable** the Flash Checkout feature
- This is **REQUIRED** for subscriptions to work

### **2. Configure Webhooks**
- Go to **Settings** → **Webhooks**
- Add webhook URL: `https://yourdomain.com/api/payments/webhook`
- Select these events:
  - `subscription.authenticated`
  - `subscription.activated`
  - `subscription.charged`
  - `subscription.completed`
  - `subscription.cancelled`
  - `subscription.halted`
  - `subscription.paused`
  - `subscription.resumed`

### **3. Enable Subscriptions**
- Go to **Settings** → **Payment Methods**
- Make sure **Subscriptions** is enabled
- Verify your account is approved for subscriptions

## 🧪 **Testing Steps**

### **1. Test with Test Cards (Test Mode)**
- **Domestic Visa**: 4718 6091 0820 4366
- **Domestic Mastercard**: 5104 0600 0000 0008
- **International Mastercard**: 5104 0155 5555 5558

### **2. Test with Real Cards (Live Mode)**
- Use your actual debit/credit cards
- Make sure you have sufficient balance

## 🔍 **Debugging Steps**

### **1. Check Razorpay Dashboard**
- Look for any account restrictions
- Verify subscription feature is enabled
- Check if Flash Checkout is enabled

### **2. Check Console Logs**
- Look for any error messages in the browser console
- Check server logs for API errors

### **3. Verify Environment**
- Run: `node check-razorpay-config.js`
- Ensure all environment variables are correct

## 🚨 **Common Error Messages & Solutions**

| Error | Cause | Solution |
|-------|-------|----------|
| "This payment has failed due to an issue with the merchant" | Flash Checkout not enabled | Enable Flash Checkout in dashboard |
| "Invalid API key" | Wrong key type (test vs live) | Use correct keys for environment |
| "Subscription not supported" | Account not approved | Contact Razorpay support |
| "Webhook failed" | Webhook URL not configured | Configure webhook URL |

## 📞 **Support**

If issues persist:
1. **Razorpay Support**: [support.razorpay.com](https://support.razorpay.com)
2. **Check Razorpay Status**: [status.razorpay.com](https://status.razorpay.com)
3. **Razorpay Documentation**: [razorpay.com/docs](https://razorpay.com/docs)

---

**Next Steps:**
1. Fix the key/environment mismatch
2. Enable Flash Checkout in dashboard
3. Test with appropriate cards
4. Configure webhooks
