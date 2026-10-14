import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  label: { type: String, default: "Home", trim: true },
  recipientName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  addressLine: { type: String, required: true, trim: true },
  country: { type: String, required: true, trim: true, default: "Nigeria" },
  countryCode: { type: String, required: true, trim: true, default: "NG" },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  localGovernment: { type: String, default: "", trim: true },
  nearestBusStop: { type: String, default: "", trim: true, maxlength: 200 },
  deliveryNote: { type: String, default: "", trim: true }
}, { _id: true });

const shopCustomerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  phone: { type: String, default: "", trim: true },
  password: { type: String, required: true, select: false },
  linkedUser: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, sparse: true },
  addresses: { type: [addressSchema], default: [] },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("ShopCustomer", shopCustomerSchema);
