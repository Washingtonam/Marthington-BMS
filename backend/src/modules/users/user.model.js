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
        "staff"
      ],
      default: "staff"
    },

    business: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      default: null
    },

    permissions: {
      type: permissionSchema,

      default: () => ({
        canViewProducts: true,
        canMakeSale: true,
        canViewSales: true
      })
    },

    isActive: {
      type: Boolean,
      default: true
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