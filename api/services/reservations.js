import mongoose from "mongoose"
import { createHash, randomBytes } from "node:crypto"
import { Booking, Room } from "../models/index.js"
import { ApiError } from "../utils/errors.js"

export const hashToken = (token) => createHash("sha256").update(token).digest("hex")
export function quote(room, stay, taxPercent) {
  const nights = (Date.parse(stay.checkout) - Date.parse(stay.checkin)) / 86400000
  const subtotal = Math.round(room.price * 100) * nights
  const tax = Math.round((subtotal * taxPercent) / 100)
  return { nights, subtotal, tax, amount: subtotal + tax, nightlyRate: room.price, currency: "INR" }
}

export function availableInventory(room, stay, bookings) {
  let minimum = room.inventory
  for (let time = Date.parse(stay.checkin); time < Date.parse(stay.checkout); time += 86400000) {
    const day = new Date(time).toISOString().slice(0, 10)
    const used = bookings
      .filter((b) => b.stay.checkin <= day && b.stay.checkout > day)
      .reduce((sum, b) => sum + b.stay.quantity, 0)
    minimum = Math.min(minimum, room.inventory - used)
  }
  return Math.max(0, minimum)
}

export async function availability(room, stay, session, exclude) {
  const filter = {
    "stay.checkin": { $lt: stay.checkout },
    "stay.checkout": { $gt: stay.checkin },
    $or: [
      { status: "Confirmed" },
      { status: "Pending confirmation", expiresAt: { $gt: new Date() } },
    ],
  }
  if (exclude) filter._id = { $ne: exclude }
  const bookings = await Booking.find(filter)
    .session(session ?? null)
    .lean()
  return availableInventory(room, stay, bookings)
}

export const publicBooking = (b) => ({
  reference: b.reference,
  room: b.room,
  stay: b.stay,
  guest: b.guest,
  status: b.status,
  payment: b.payment,
  amount: b.amount,
  subtotal: b.subtotal,
  tax: b.tax,
  nightlyRate: b.nightlyRate,
  currency: b.currency,
  expiresAt: b.expiresAt,
  refundRequired: b.refundRequired,
  createdAt: b.createdAt,
})

export async function createReservation(input, env, user) {
  const token = randomBytes(32).toString("hex")
  let result
  await mongoose.connection.transaction(async (session) => {
    // Every inventory-changing operation writes the room first. Concurrent
    // transactions then conflict and retry before reading reservation totals.
    const room = await Room.findOneAndUpdate(
      { id: input.room, active: true },
      { $inc: { revision: 1 } },
      { returnDocument: 'after', session },
    )
    if (!room) throw new ApiError(404, "Property not found")
    if (input.stay.adults + input.stay.children > room.guests)
      throw new ApiError(400, "Guest count exceeds property capacity")
    input.stay.quantity = 1
    if ((await availability({ ...room.toObject(), inventory: 1 }, input.stay, session)) < 1)
      throw new ApiError(409, "The property is unavailable for these dates")
    const [booking] = await Booking.create(
      [
        {
          ...input,
          ...quote(room, input.stay, env.TAX_PERCENT),
          reference: `VANA-${randomBytes(8).toString("hex").toUpperCase()}`,
          tokenHash: hashToken(token),
          user: user?._id,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      ],
      { session },
    )
    result = publicBooking(booking)
  })
  return { booking: result, bookingToken: token }
}

export async function authorizedBooking(req) {
  const booking = await Booking.findOne({ reference: req.params.reference }).select("+tokenHash")
  if (!booking) throw new ApiError(404, "Reservation not found")
  const token = req.get("X-Booking-Token")
  const isOwner = req.user && (req.user.role === "admin" || booking.user?.equals(req.user._id))
  if (!isOwner && !(token && token.length <= 128 && hashToken(token) === booking.tokenHash))
    throw new ApiError(403, "Booking authorization required")
  return booking
}

export async function cancelReservation(reference) {
  let result
  await mongoose.connection.transaction(async (session) => {
    const original = await Booking.findOne({ reference }).session(session)
    if (!original) throw new ApiError(404, "Reservation not found")
    await Room.updateOne({ id: original.room }, { $inc: { revision: 1 } }, { session })
    const booking = await Booking.findById(original._id).session(session)
    booking.status = "Cancelled"
    booking.refundRequired = booking.payment === "Paid"
    await booking.save({ session })
    result = publicBooking(booking)
  })
  return result
}

export async function confirmCapturedPayment(payment) {
  let result
  await mongoose.connection.transaction(async (session) => {
    const original = await Booking.findOne({ orderId: payment.order_id }).session(session)
    if (!original) throw new ApiError(404, "Payment order not found")
    const room = await Room.findOneAndUpdate(
      { id: original.room },
      { $inc: { revision: 1 } },
      { returnDocument: 'after', session },
    )
    const booking = await Booking.findById(original._id).session(session)
    if (
      payment.status !== "captured" ||
      payment.amount !== booking.amount ||
      payment.currency !== booking.currency
    )
      throw new ApiError(400, "Captured payment does not match reservation")
    if (booking.payment === "Paid") {
      if (booking.paymentId !== payment.id)
        throw new ApiError(409, "Reservation already has a different payment")
      result = publicBooking(booking)
      return
    }
    booking.payment = "Paid"
    booking.paymentId = payment.id
    const hasInventory =
      room &&
      (await availability({ ...room.toObject(), inventory: 1 }, booking.stay, session, booking._id)) >= 1
    if (
      booking.status !== "Cancelled" &&
      hasInventory &&
      booking.stay.checkin >=
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date())
    ) {
      booking.status = "Confirmed"
    } else {
      if (booking.status !== "Cancelled") booking.status = "Payment review"
      booking.refundRequired = true
    }
    await booking.save({ session })
    result = publicBooking(booking)
  })
  return result
}
