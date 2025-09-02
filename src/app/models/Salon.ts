// salon.model.ts
import mongoose, { Schema, Document, Model } from "mongoose";

// Types / Interfaces
export interface ISalon extends Document {
  name: string;
  slug: string;
  status: "pending" | "incomplete" | "complete";
  address?: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    coordinates?: {
      type: "Point";
      coordinates: [number, number];
    };
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  branding?: {
    logos: {
      url: string;
      publicId: string;
    }[];
    covers: {
      url: string;
      publicId: string;
    }[];
  };
  ownerId: mongoose.Types.ObjectId;
  staff: mongoose.Types.ObjectId[];
  subscription: {
    plan: "trial" | "monthly" | "yearly" | "enterprise";
    status: "active" | "expired" | "cancelled" | "paused";
    startedAt: Date;
    expiresAt?: Date;
    paymentMethod?: string;
    paymentStatus?: string;
  };
  businessHours?: {
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
  }[];
  specialClosures?: {
    date: Date;
    reason?: string;
  }[];
  categories?: string[];
  settings?: {
    timezone: string;
    currency: string;
    queueEnabled: boolean;
  };
  queueSettings?: {
    maxQueueSize: number;
    estimatedServiceTime: number; // minutes per customer
    allowFutureBookings: boolean;
    autoConfirmBookings: boolean;
    showCustomerNames: boolean; // privacy setting
  };
  notifications?: {
    webhookUrl?: string;
    emailNotifications: boolean;
    smsNotifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Schema
const SalonSchema = new Schema<ISalon>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: [3, "Name must be at least 3 characters"],
      maxLength: [100, "Name cannot exceed 100 characters"],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minLength: [3, "Slug must be at least 3 characters"],
      maxLength: [50, "Slug cannot exceed 50 characters"],
      match: [
        /^[a-z0-9-]+$/,
        "Slug can only contain lowercase letters, numbers, and hyphens",
      ], // Add this
    },
    status: {
      type: String,
      enum: ["pending", "incomplete", "complete"],
      default: "pending",
      required: true,
    },
    address: {
      line1: { type: String, trim: true, maxLength: 100 },
      line2: { type: String, trim: true, maxLength: 100 },
      city: { type: String, required: false },
      state: { type: String, trim: true, maxLength: 100 },
      country: { type: String, trim: true, maxLength: 100 },
      postalCode: { type: String, trim: true, maxLength: 20 },
      coordinates: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: {
          type: [Number],
          validate: {
            validator: (v: number[]) => v.length === 2,
            message:
              "Coordinates must contain exactly 2 numbers (longitude, latitude)",
          },
        },
      },
    },
    contact: {
      phone: { type: String, trim: true, maxLength: 20 },
      email: {
        type: String,
        trim: true,
        maxLength: 255,
        match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, "Invalid email format"],
      },
    },
    branding: {
      logos: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
      ],
      covers: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true },
        },
      ],
    },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    staff: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
    },
    subscription: {
      plan: {
        type: String,
        enum: ["trial", "monthly", "yearly", "enterprise"],
        required: true,
        default: "trial",
      },
      status: {
        type: String,
        enum: ["active", "expired", "cancelled", "paused"],
        required: true,
        default: "active",
      },
      startedAt: { type: Date, required: true, default: Date.now },
      expiresAt: { type: Date },
      paymentMethod: { type: String, trim: true },
      paymentStatus: { type: String, trim: true },
    },
    businessHours: [
      {
        day: {
          type: String,
          required: true,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        },
        open: {
          type: String,
          required: true,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"],
        },
        close: {
          type: String,
          required: true,
          match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"],
        },
        isClosed: { type: Boolean, default: false },
      },
    ],
    specialClosures: [
      {
        date: { type: Date, required: true },
        reason: { type: String, trim: true, maxLength: 200 },
      },
    ],
    categories: [
      {
        type: String,
        enum: ["Hair", "Nails", "Spa", "Massage", "Barber", "Makeup", "Other"],
      },
    ],
    settings: {
      timezone: { type: String, default: "UTC", trim: true },
      currency: {
        type: String,
        enum: ["USD", "EUR", "GBP", "CAD", "AUD", "INR"],
        default: "INR",
      },
      queueEnabled: { type: Boolean, default: true },
    },
    queueSettings: {
      maxQueueSize: {
        type: Number,
        default: 50,
        min: [1, "Max queue size must be at least 1"],
        max: [200, "Max queue size cannot exceed 200"]
      },
      estimatedServiceTime: {
        type: Number,
        default: 30,
        min: [5, "Service time must be at least 5 minutes"],
        max: [300, "Service time cannot exceed 300 minutes"]
      },
      allowFutureBookings: { type: Boolean, default: true },
      autoConfirmBookings: { type: Boolean, default: false },
      showCustomerNames: { type: Boolean, default: true },
    },
    notifications: {
      webhookUrl: {
        type: String,
        trim: true,
        match: [/^https?:\/\/.+/, "Webhook URL must be a valid HTTP/HTTPS URL"]
      },
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Indexes
SalonSchema.index({ "address.coordinates": "2dsphere" });
SalonSchema.index({ name: "text" });
SalonSchema.index({ ownerId: 1, slug: 1 }, { unique: true });

// Custom Validation for Subscription - handled in validators

const Salon: Model<ISalon> =
  mongoose.models.Salon || mongoose.model<ISalon>("Salon", SalonSchema);

export default Salon;