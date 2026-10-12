import mongoose from "mongoose"

const { Schema } = mongoose
const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["guest", "admin"], default: "guest" },
  },
  { timestamps: true },
)

const roomSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: String,
    description: String,
    image: String,
    imageUrls: { type: [String], default: undefined },
    price: { type: Number, required: true, min: 1 },
    guests: { type: Number, required: true, min: 1 },
    size: Number,
    pool: { type: Boolean, default: false },
    inventory: { type: Number, required: true, min: 0 },
    active: { type: Boolean, default: true },
    revision: { type: Number, default: 0 },
  },
  { timestamps: true },
)

const bookingSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true },
    room: { type: String, required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    stay: {
      checkin: { type: String, required: true },
      checkout: { type: String, required: true },
      adults: Number,
      children: Number,
      quantity: Number,
    },
    guest: { name: String, email: String, phone: String, requests: String },
    status: {
      type: String,
      enum: ["Pending confirmation", "Confirmed", "Cancelled", "Payment review"],
      default: "Pending confirmation",
    },
    payment: { type: String, enum: ["Unpaid", "Paid"], default: "Unpaid" },
    amount: { type: Number, required: true },
    subtotal: Number,
    tax: Number,
    nightlyRate: Number,
    currency: { type: String, default: "INR" },
    expiresAt: { type: Date, required: true },
    tokenHash: { type: String, required: true, select: false },
    orderId: String,
    orderLockUntil: Date,
    paymentId: String,
    refundRequired: { type: Boolean, default: false },
  },
  { timestamps: true },
)
bookingSchema.index({ room: 1, "stay.checkin": 1, "stay.checkout": 1, status: 1 })
bookingSchema.index(
  { orderId: 1 },
  { unique: true, partialFilterExpression: { orderId: { $type: "string" } } },
)
bookingSchema.index(
  { paymentId: 1 },
  { unique: true, partialFilterExpression: { paymentId: { $type: "string" } } },
)

export const User = mongoose.model("User", userSchema)
export const Room = mongoose.model("Room", roomSchema)
export const Booking = mongoose.model("Booking", bookingSchema)
