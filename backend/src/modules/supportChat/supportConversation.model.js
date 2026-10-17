import mongoose from "mongoose";

const supportMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  senderRole: {
    type: String,
    enum: ["user", "assistant", "super_admin"],
    required: true
  },
  senderName: { type: String, default: "" },
  body: { type: String, required: true, maxlength: 5000 },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const supportConversationSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true
  },
  mode: {
    type: String,
    enum: ["assistant", "support"],
    required: true
  },
  lastSender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  messages: {
    type: [supportMessageSchema],
    default: []
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadForAdmin: {
    type: Boolean,
    default: false
  },
  unreadForUser: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ["open", "closed"],
    default: "open"
  }
}, { timestamps: true });

supportConversationSchema.index({ business: 1, mode: 1 }, { unique: true });
supportConversationSchema.index({ lastMessageAt: -1 });

export default mongoose.model("SupportConversation", supportConversationSchema);
