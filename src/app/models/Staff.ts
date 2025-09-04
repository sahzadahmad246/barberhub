import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStaff extends Document {
  salonId: string;
  userId: string;
  role: 'staff' | 'manager' | 'admin';
  permissions: string[];
  isActive: boolean;
  joinedAt: Date;
  lastActiveAt?: Date;
  profile: {
    displayName?: string;
    bio?: string;
    specialties?: string[];
    experience?: number; // in years
    profilePicture?: string;
  };
  schedule: {
    workingDays: string[]; // ['monday', 'tuesday', etc.]
    workingHours: {
      start: string;
      end: string;
    };
    breakTime?: {
      start: string;
      end: string;
    };
  };
  stats: {
    totalServices: number;
    totalCustomers: number;
    averageRating: number;
    totalReviews: number;
    totalEarnings: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema = new Schema<IStaff>({
  salonId: {
    type: String,
    required: true,
    ref: 'Salon',
    index: true
  },
  userId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  role: {
    type: String,
    enum: ['staff', 'manager', 'admin'],
    default: 'staff'
  },
  permissions: [{
    type: String,
    enum: [
      'manage_queue',
      'manage_bookings',
      'manage_services',
      'manage_customers',
      'view_analytics',
      'manage_staff',
      'manage_salon_settings',
      'manage_payments',
      'view_reports'
    ]
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: {
    type: Date
  },
  profile: {
    displayName: {
      type: String,
      trim: true,
      maxlength: 50
    },
    bio: {
      type: String,
      maxlength: 500,
      trim: true
    },
    specialties: [{
      type: String,
      trim: true
    }],
    experience: {
      type: Number,
      min: 0,
      max: 50
    },
    profilePicture: {
      type: String,
      trim: true
    }
  },
  schedule: {
    workingDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    workingHours: {
      start: {
        type: String,
        default: '09:00'
      },
      end: {
        type: String,
        default: '18:00'
      }
    },
    breakTime: {
      start: String,
      end: String
    }
  },
  stats: {
    totalServices: {
      type: Number,
      default: 0
    },
    totalCustomers: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
StaffSchema.index({ salonId: 1, isActive: 1 });
StaffSchema.index({ userId: 1 });
StaffSchema.index({ salonId: 1, role: 1 });
StaffSchema.index({ 'schedule.workingDays': 1 });

// Compound index for unique staff per salon
StaffSchema.index({ salonId: 1, userId: 1 }, { unique: true });

// Method to check if staff is working on given day
StaffSchema.methods.isWorkingOn = function(day: string): boolean {
  return this.schedule.workingDays.includes(day.toLowerCase());
};

// Method to check if staff is available at given time
StaffSchema.methods.isAvailableAt = function(date: Date): boolean {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const day = dayNames[date.getDay()];
  
  if (!this.isWorkingOn(day)) return false;
  
  const currentTime = date.toTimeString().substring(0, 5);
  const startTime = this.schedule.workingHours.start;
  const endTime = this.schedule.workingHours.end;
  
  // Check if current time is within working hours
  if (currentTime < startTime || currentTime > endTime) return false;
  
  // Check if current time is during break
  if (this.schedule.breakTime) {
    const breakStart = this.schedule.breakTime.start;
    const breakEnd = this.schedule.breakTime.end;
    
    if (currentTime >= breakStart && currentTime <= breakEnd) return false;
  }
  
  return true;
};

// Method to get next available time
StaffSchema.methods.getNextAvailableTime = function(): Date {
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + i);
    const dayName = days[checkDate.getDay()];
    
    if (this.isWorkingOn(dayName)) {
      const [hours, minutes] = this.schedule.workingHours.start.split(':');
      checkDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      if (checkDate > now) {
        return checkDate;
      }
    }
  }
  
  return new Date();
};

// Method to update last active time
StaffSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

// Method to check permission
StaffSchema.methods.hasPermission = function(permission: string): boolean {
  return this.permissions.includes(permission);
};

// Static method to find active staff by salon
StaffSchema.statics.findActiveBySalon = function(salonId: string) {
  return this.find({ salonId, isActive: true }).populate('userId', 'name email');
};

// Static method to find staff by role
StaffSchema.statics.findByRole = function(salonId: string, role: string) {
  return this.find({ salonId, role, isActive: true });
};

// Static method to get staff statistics
StaffSchema.statics.getStaffStats = function(salonId: string) {
  return this.aggregate([
    { $match: { salonId, isActive: true } },
    {
      $group: {
        _id: null,
        totalStaff: { $sum: 1 },
        averageRating: { $avg: '$stats.averageRating' },
        totalServices: { $sum: '$stats.totalServices' },
        totalCustomers: { $sum: '$stats.totalCustomers' },
        totalEarnings: { $sum: '$stats.totalEarnings' }
      }
    }
  ]);
};

const Staff: Model<IStaff> = mongoose.models.Staff || mongoose.model<IStaff>('Staff', StaffSchema);

export default Staff;
