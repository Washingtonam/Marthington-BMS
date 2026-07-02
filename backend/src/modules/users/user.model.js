import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    // PRODUCTS
    canManageProducts: {
      type: Boolean,
      default: false
    },

    canViewProducts: {
      type: Boolean,
      default: true
    },

    canViewDashboard: {
      type: Boolean,
      default: false
    },

    // SALES
    canMakeSale: {
      type: Boolean,
      default: true
    },

    canViewSales: {
      type: Boolean,
      default: true
    },

    // REPORTS
    canViewReports: {
      type: Boolean,
      default: false
    },

    // PRICE OVERRIDE
    canOverridePrice: {
      type: Boolean,
      default: false
    },

    // STAFF
    canManageStaff: {
      type: Boolean,
      default: false
    },

    // SETTINGS
    canManageSettings: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true,
      unique: true
    },

    password: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: [
        "super_admin",
        "owner",
        "manager",
        "cashier",
        "staff",
        "affiliate"
      ],
      default: "staff"
    },

    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      default: null
    },

    refreshToken: {
      type: String,
      default: null
    },

    permissions: {
      type: permissionSchema,

      default: () => ({
        canViewDashboard: false,
        canManageProducts: false,
        canViewProducts: true,
        canMakeSale: true,
        canViewSales: true,
        canViewReports: false,
        canOverridePrice: false,
        canManageStaff: false,
        canManageSettings: false
      })
    },

    isActive: {
      type: Boolean,
      default: true
    },

    affiliateCode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      default: null
    },

    walletBalance: {
      type: Number,
      default: 0
    },

    totalEarned: {
      type: Number,
      default: 0
    },

    paymentDetails: {
      bankName: {
        type: String,
        default: ""
      },
      accountNumber: {
        type: String,
        default: ""
      },
      accountName: {
        type: String,
        default: ""
      }
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model(
  "User",
  userSchema
);