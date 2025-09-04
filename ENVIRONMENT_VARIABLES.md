# 🔧 Environment Variables Configuration

## 📋 Required Environment Variables

Copy these variables to your `.env.local` file and replace the placeholder values with your actual credentials.

### 🗄️ Database Configuration
```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/barberhub
# For production: mongodb+srv://username:password@cluster.mongodb.net/barberhub
```

### 🔐 NextAuth Configuration
```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here
```

### 🔑 Google OAuth Configuration
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 📧 Email Service Configuration (Resend)
```bash
RESEND_API_KEY=your-resend-api-key
```

### 💳 Razorpay Payment Gateway Configuration
```bash
# Razorpay Credentials
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# Environment (test for testing, live for production)
RAZORPAY_ENVIRONMENT=test
# RAZORPAY_ENVIRONMENT=live

# Webhook Security
RAZORPAY_WEBHOOK_SECRET=your-razorpay-webhook-secret

# Razorpay API Endpoints (automatically set based on environment)
# Test: https://api.razorpay.com/v1
# Live: https://api.razorpay.com/v1
```

### ☁️ Cloudinary Configuration (for image uploads)
```bash
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

### 🚀 Redis Configuration (for caching and sessions)
```bash
REDIS_URL=redis://localhost:6379
# For production: redis://username:password@host:port
```

### 🔌 Socket.IO Configuration
```bash
SOCKET_IO_PORT=3001
```

### ⚙️ Application Configuration
```bash
NODE_ENV=development
APP_URL=http://localhost:3000
```

### 💰 Subscription Plans Configuration
```bash
TRIAL_DURATION_DAYS=30
PRO_PLAN_PRICE_MONTHLY=2900
PRO_PLAN_PRICE_YEARLY=29000
PRO_PLUS_PLAN_PRICE_MONTHLY=4900
PRO_PLUS_PLAN_PRICE_YEARLY=49000
```

### 🛡️ Security Configuration
```bash
JWT_SECRET=your-jwt-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here
```

### 📊 Analytics Configuration (optional)
```bash
GOOGLE_ANALYTICS_ID=your-google-analytics-id
```

### 📱 WhatsApp/SMS Configuration (for Pro Plus features)
```bash
# Twilio for SMS
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number

# WhatsApp Business API
WHATSAPP_BUSINESS_TOKEN=your-whatsapp-business-token
WHATSAPP_PHONE_NUMBER_ID=your-whatsapp-phone-number-id
```

### 👨‍💼 Admin Configuration
```bash
ADMIN_EMAIL=admin@barberhub.com
ADMIN_PASSWORD=your-admin-password
```

### 📝 Logging Configuration
```bash
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log
```

### 📁 File Upload Configuration
```bash
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp
```

### 🌐 CORS Configuration
```bash
CORS_ORIGIN=http://localhost:3000
# For production: https://yourdomain.com
```

### 🔄 Session Configuration
```bash
SESSION_MAX_AGE=2592000
SESSION_UPDATE_AGE=86400
```

### 📧 Email Templates Configuration
```bash
EMAIL_FROM_NAME=BarberHub
EMAIL_FROM_ADDRESS=noreply@barberhub.com
```

### 🌍 Business Configuration
```bash
DEFAULT_TIMEZONE=Asia/Kolkata
DEFAULT_CURRENCY=INR
DEFAULT_LANGUAGE=en
```

### 🚩 Feature Flags
```bash
ENABLE_ANALYTICS=true
ENABLE_REVIEWS=true
ENABLE_WHATSAPP=false
ENABLE_SMS=false
ENABLE_PUSH_NOTIFICATIONS=false
```

---

## 🚀 Setup Instructions

### 1. Create Environment File
```bash
# Copy the example file
cp .env.example .env.local

# Or create manually
touch .env.local
```

### 2. Get Razorpay Credentials
1. Sign up at [Razorpay](https://razorpay.com/)
2. Go to Settings > API Keys
3. Get your Key ID and Key Secret
4. Set up webhook URL: `https://yourdomain.com/api/payments/webhook`

### 3. Get Other Service Credentials
- **Resend**: Sign up at [Resend](https://resend.com/) for email service
- **Cloudinary**: Sign up at [Cloudinary](https://cloudinary.com/) for image storage
- **Google OAuth**: Create project at [Google Cloud Console](https://console.cloud.google.com/)

### 4. Generate Secrets
```bash
# Generate NextAuth secret
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 32

# Generate encryption key
openssl rand -base64 32
```

### 5. Update Your .env.local File
Replace all placeholder values with your actual credentials.

---

## 🔒 Security Notes

- Never commit `.env.local` to version control
- Use strong, unique secrets for production
- Regularly rotate your API keys
- Use environment-specific configurations
- Enable webhook signature verification for Razorpay

---

## 📞 Support

If you need help setting up any of these services, refer to their official documentation:
- [Razorpay Documentation](https://razorpay.com/docs/)
- [Resend Documentation](https://resend.com/docs)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [NextAuth Documentation](https://next-auth.js.org/)
