import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Types / Interfaces
export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Optional for Google OAuth users
  profilePicture?: {
    url: string;
    publicId: string;
  };
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  role: 'user' | 'staff' | 'owner' | 'admin';
  salonId?: mongoose.Types.ObjectId;
  provider: 'email' | 'google' | 'both';
  googleId?: string;
  // New fields for password reset and OTP verification
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  otpCode?: string;
  otpExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
  generateOTP(): string;
  verifyOTP(otp: string): boolean;
}

// Schema
const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minLength: [2, 'Name must be at least 2 characters'],
      maxLength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Invalid email format'],
    },
    password: {
      type: String,
      minLength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include in queries by default
      validate: {
        validator: function(this: IUser, password: string) {
          // Password is required for email provider, optional for google
          if (this.provider === 'email' && !password) {
            return false;
          }
          return true;
        },
        message: 'Password is required for email authentication'
      }
    },
    profilePicture: {
      url: {
        type: String,
        trim: true,
      },
      publicId: {
        type: String,
        trim: true,
      },
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false, // Don't include in queries by default
    },
    emailVerificationExpires: {
      type: Date,
      select: false, // Don't include in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'staff', 'owner', 'admin'],
        message: 'Role must be one of: user, staff, owner, admin'
      },
      default: 'user',
    },
    salonId: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
    },
    provider: {
      type: String,
      enum: {
        values: ['email', 'google', 'both'],
        message: 'Provider must be either email, google, or both'
      },
      required: [true, 'Provider is required'],
    },
    googleId: {
      type: String,
      index: true, // define index once here to avoid duplicate schema.index
      validate: {
        validator: function(this: IUser, googleId: string) {
          // Google ID is required for google provider
          if (this.provider === 'google' && !googleId) {
            return false;
          }
          return true;
        },
        message: 'Google ID is required for Google authentication'
      }
    },
    // New fields for password reset and OTP verification
    passwordResetToken: {
      type: String,
      select: false, // Don't include in queries by default
    },
    passwordResetExpires: {
      type: Date,
      select: false, // Don't include in queries by default
    },
    otpCode: {
      type: String,
      select: false, // Don't include in queries by default
    },
    otpExpiresAt: {
      type: Date,
      select: false, // Don't include in queries by default
    },
  },
  { 
    timestamps: true,
    // Ensure virtual fields are serialized
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes: keep only those not already defined on fields
UserSchema.index({ emailVerificationToken: 1 });
UserSchema.index({ salonId: 1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new) and exists
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  // If password already looks like a bcrypt hash, skip re-hashing
  // Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 chars
  if (/^\$2[aby]?\$/.test(this.password) && this.password.length >= 60) {
    return next();
  }

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Instance method to compare password
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate email verification token
UserSchema.methods.generateEmailVerificationToken = function(): string {
  const token = crypto.randomBytes(32).toString('hex');
  
  this.emailVerificationToken = token;
  this.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return token;
};

// Instance method to generate password reset token
UserSchema.methods.generatePasswordResetToken = function(): string {
  const token = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = token;
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  
  return token;
};

// Instance method to generate OTP for email verification
UserSchema.methods.generateOTP = function(): string {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  this.otpCode = otp;
  this.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  return otp;
};

// Instance method to verify OTP
UserSchema.methods.verifyOTP = function(otp: string): boolean {
  if (!this.otpExpiresAt || this.otpExpiresAt.getTime() < Date.now()) {
    return false;
  }
  return this.otpCode === otp;
};

// Ensure email verification is set to true for Google users
UserSchema.pre('validate', function(next) {
  if (this.provider === 'google') {
    this.emailVerified = true;
  }
  next();
});

const User: Model<IUser> = 
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;