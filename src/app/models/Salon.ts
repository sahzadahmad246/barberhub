import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBusinessHours {
  monday: { open: string; close: string; isOpen: boolean };
  tuesday: { open: string; close: string; isOpen: boolean };
  wednesday: { open: string; close: string; isOpen: boolean };
  thursday: { open: string; close: string; isOpen: boolean };
  friday: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
}

export interface ISocialLinks {
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
}

export interface ISalon extends Document {
  ownerId: string;
  name: string;
  slug: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  contact: {
    phone: string;
    email: string;
    whatsapp?: string;
  };
  businessHours: IBusinessHours;
  description?: string;
  amenities?: string[];
  photos?: string[];
  socialLinks?: ISocialLinks;
  isVerified: boolean;
  isActive: boolean;
  subscriptionId: string;
  settings: {
    allowOnlineBooking: boolean;
    allowQueueJoining: boolean;
    requireCustomerInfo: boolean;
    maxQueueSize: number;
    autoAcceptBookings: boolean;
    sendNotifications: boolean;
  };
  stats: {
    totalCustomers: number;
    totalBookings: number;
    totalRevenue: number;
    averageRating: number;
    totalReviews: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BusinessHoursSchema = new Schema<IBusinessHours>({
  monday: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    isOpen: { type: Boolean, default: true }
  },
  tuesday: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    isOpen: { type: Boolean, default: true }
  },
  wednesday: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    isOpen: { type: Boolean, default: true }
  },
  thursday: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    isOpen: { type: Boolean, default: true }
  },
  friday: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    isOpen: { type: Boolean, default: true }
  },
  saturday: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    isOpen: { type: Boolean, default: true }
  },
  sunday: {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '18:00' },
    isOpen: { type: Boolean, default: false }
  }
}, { _id: false });

const SocialLinksSchema = new Schema<ISocialLinks>({
  website: String,
  facebook: String,
  instagram: String,
  twitter: String,
  linkedin: String
}, { _id: false });

const SalonSchema = new Schema<ISalon>({
  ownerId: {
    type: String,
    required: true,
    ref: 'User',
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      required: true,
      default: 'India',
      trim: true
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  contact: {
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    whatsapp: {
      type: String,
      trim: true
    }
  },
  businessHours: {
    type: BusinessHoursSchema,
    required: true
  },
  description: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  amenities: [{
    type: String,
    trim: true
  }],
  photos: [{
    type: String,
    trim: true
  }],
  socialLinks: {
    type: SocialLinksSchema
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  subscriptionId: {
    type: String,
    required: true,
    ref: 'Subscription'
  },
  settings: {
    allowOnlineBooking: {
      type: Boolean,
      default: true
    },
    allowQueueJoining: {
      type: Boolean,
      default: true
    },
    requireCustomerInfo: {
      type: Boolean,
      default: true
    },
    maxQueueSize: {
      type: Number,
      default: 50,
      min: 1,
      max: 200
    },
    autoAcceptBookings: {
      type: Boolean,
      default: false
    },
    sendNotifications: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    totalCustomers: {
      type: Number,
      default: 0
    },
    totalBookings: {
      type: Number,
      default: 0
    },
    totalRevenue: {
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
    }
  }
}, {
  timestamps: true
});

// Indexes for better performance
SalonSchema.index({ 'address.city': 1 });
SalonSchema.index({ 'address.pincode': 1 });
SalonSchema.index({ isActive: 1, isVerified: 1 });
SalonSchema.index({ subscriptionId: 1 });

// Pre-save middleware to generate slug
SalonSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Method to check if salon is open at given time
SalonSchema.methods.isOpenAt = function(date: Date): boolean {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const day = dayNames[date.getDay()];
  const dayHours = this.businessHours[day as keyof IBusinessHours];
  
  if (!dayHours.isOpen) return false;
  
  const currentTime = date.toTimeString().substring(0, 5);
  return currentTime >= dayHours.open && currentTime <= dayHours.close;
};

// Method to get next opening time
SalonSchema.methods.getNextOpeningTime = function(): Date {
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(now);
    checkDate.setDate(now.getDate() + i);
    const dayName = days[checkDate.getDay()];
    const dayHours = this.businessHours[dayName as keyof IBusinessHours];
    
    if (dayHours.isOpen) {
      const [hours, minutes] = dayHours.open.split(':');
      checkDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      if (checkDate > now) {
        return checkDate;
      }
    }
  }
  
  return new Date();
};

// Static method to find salons by location
SalonSchema.statics.findByLocation = function(city: string, pincode?: string) {
  const query: Record<string, unknown> = {
    'address.city': new RegExp(city, 'i'),
    isActive: true,
    isVerified: true
  };
  
  if (pincode) {
    query['address.pincode'] = pincode;
  }
  
  return this.find(query);
};

const Salon: Model<ISalon> = mongoose.models.Salon || mongoose.model<ISalon>('Salon', SalonSchema);

export default Salon;