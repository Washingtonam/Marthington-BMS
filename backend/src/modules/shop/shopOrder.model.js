import mongoose from "mongoose";

const shopOrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  business: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true },
  productName: { type: String, required: true },
  category: { type: String, default: "General" },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  supplierName: { type: String, required: true },
  supplierPhone: { type: String, default: "" }
}, { _id: false });

const shopRefundSchema = new mongoose.Schema({
  requestKey: { type: String, required: true },
  source: { type: String, enum: ["products", "delivery_fee"], required: true },
  method: { type: String, enum: ["paystack", "manual"], default: "paystack" },
  transactionReference: { type: String, default: "" },
  externalReference: { type: String, default: "" },
  paystackRefundId: { type: String, default: "" },
  amount: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ["initializing", "pending", "processed", "failed"], default: "initializing" },
  reason: { type: String, default: "" },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  requestedAt: { type: Date, default: Date.now },
  processedAt: { type: Date, default: null },
  error: { type: String, default: "" }
}, { _id: false });

const shopOrderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "ShopCustomer", required: true, index: true },
  customerSnapshot: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" }
  },
  deliveryAddress: {
    recipientName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    deliveryNote: { type: String, default: "" }
  },
  items: { type: [shopOrderItemSchema], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  deliveryFee: { type: Number, default: 0, min: 0 },
  deliveryAreaName: { type: String, default: "" },
  totalPaid: { type: Number, default: 0, min: 0 },
  totalRefunded: { type: Number, default: 0, min: 0 },
  refunds: { type: [shopRefundSchema], default: [] },
  refundInProgress: { type: Boolean, default: false, select: false },
  paymentReference: { type: String, default: "", index: true },
  deliveryPaymentReference: { type: String, default: "" },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "delivery_fee_pending", "complete", "partially_refunded", "failed", "refunded"],
    default: "pending"
  },
  deliveryFeePaymentStatus: {
    type: String,
    enum: ["not_set", "pending", "paid"],
    default: "not_set"
  },
  status: {
    type: String,
    enum: ["awaiting_payment", "received", "sourcing", "preparing_delivery", "out_for_delivery", "delivered", "cancelled", "expired"],
    default: "awaiting_payment",
    index: true
  },
  adminNote: { type: String, default: "" },
  deliveryFeeConfirmedAt: { type: Date, default: null },
  deliveryFeeDueAt: { type: Date, default: null },
  stockReserved: { type: Boolean, default: false },
  paymentExpiresAt: { type: Date, default: null }
}, { timestamps: true });

shopOrderSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("ShopOrder", shopOrderSchema);
