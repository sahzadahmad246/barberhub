import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface IPendingUser extends Document {
  name: string;
  email: string;
  passwordHash: string; // hashed already by controller before save
  otpHash: string; // hashed OTP
  otpExpiresAt: Date;
  provider: 'email';
  createdAt: Date;
  updatedAt: Date;
  setOtp(otp: string, ttlMs: number): void;
  verifyOtp(otp: string): boolean;
  verifyPassword(candidatePassword: string): Promise<boolean>;
}

const PendingUserSchema = new Schema<IPendingUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: { unique: true } },
  passwordHash: { type: String, required: true, select: false },
  otpHash: { type: String, required: true, select: false },
  otpExpiresAt: { type: Date, required: true },
  provider: { type: String, enum: ['email'], default: 'email' }
}, {
  timestamps: true
});

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

PendingUserSchema.methods.setOtp = function(otp: string, ttlMs: number) {
  this.otpHash = hashOtp(otp);
  this.otpExpiresAt = new Date(Date.now() + ttlMs);
};

PendingUserSchema.methods.verifyOtp = function(otp: string): boolean {
  if (!this.otpExpiresAt || this.otpExpiresAt.getTime() < Date.now()) {
    return false;
  }
  return this.otpHash === hashOtp(otp);
};

// Instance method to verify password
PendingUserSchema.methods.verifyPassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Indexes defined on fields above to avoid duplicates


const PendingUser: Model<IPendingUser> = mongoose.models.PendingUser || mongoose.model<IPendingUser>('PendingUser', PendingUserSchema);

export default PendingUser;

