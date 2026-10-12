import { Router } from 'express'
import { z } from 'zod'
import { auth } from '../middleware/auth.js'
import { Booking } from '../models/index.js'
import { authorizedBooking, confirmCapturedPayment } from '../services/reservations.js'
import { paymentClient, matchesSignature, providerCall } from '../services/payments.js'
import { referenceSchema } from '../utils/validation.js'
import { ApiError } from '../utils/errors.js'

export function paymentRoutes(env) {
  const router = Router()
  router.use(auth(env, true))
  router.post('/:reference/order', async (req, res) => {
    referenceSchema.parse(req.params.reference)
    const booking = await authorizedBooking(req)
    const client = paymentClient(env)
    if (booking.status !== 'Pending confirmation' || booking.payment !== 'Unpaid' || booking.expiresAt <= new Date()) throw new ApiError(409, 'Reservation is not awaiting payment or its room hold has expired')
    let order
    if (booking.orderId) {
      order = await providerCall(() => client.orders.fetch(booking.orderId))
    } else {
      const claimed = await Booking.findOneAndUpdate({
        _id: booking._id, orderId: { $exists: false }, status: 'Pending confirmation', expiresAt: { $gt: new Date() },
        $or: [{ orderLockUntil: { $exists: false } }, { orderLockUntil: { $lt: new Date() } }],
      }, { $set: { orderLockUntil: new Date(Date.now() + 120000) } }, { returnDocument: 'after' })
      if (!claimed) throw new ApiError(409, 'Payment order is already being prepared. Retry shortly.')
      try {
        order = await providerCall(() => client.orders.create({ amount: booking.amount, currency: booking.currency, receipt: booking.reference }))
        await Booking.updateOne({ _id: booking._id }, { $set: { orderId: order.id }, $unset: { orderLockUntil: 1 } })
      } catch (error) {
        await Booking.updateOne({ _id: booking._id }, { $unset: { orderLockUntil: 1 } })
        throw error
      }
    }
    res.json({ keyId: env.RAZORPAY_KEY_ID, order: { id: order.id, amount: order.amount, currency: order.currency } })
  })
  router.post('/:reference/verify', async (req, res) => {
    referenceSchema.parse(req.params.reference)
    const input = z.object({ razorpay_order_id: z.string().max(100), razorpay_payment_id: z.string().max(100), razorpay_signature: z.string().length(64) }).strict().parse(req.body)
    const booking = await authorizedBooking(req)
    if (!booking.orderId || booking.orderId !== input.razorpay_order_id || !matchesSignature(`${booking.orderId}|${input.razorpay_payment_id}`, input.razorpay_signature, env.RAZORPAY_KEY_SECRET)) throw new ApiError(400, 'Invalid payment signature')
    const payment = await providerCall(() => paymentClient(env).payments.fetch(input.razorpay_payment_id))
    if (payment.order_id !== booking.orderId) throw new ApiError(400, 'Payment order does not match reservation')
    res.json({ booking: await confirmCapturedPayment(payment) })
  })
  return router
}

export function webhookHandler(env) {
  return async (req, res) => {
    if (!env.RAZORPAY_WEBHOOK_SECRET) throw new ApiError(503, 'Payment webhook is not configured')
    if (!Buffer.isBuffer(req.body) || !matchesSignature(req.body, req.get('X-Razorpay-Signature'), env.RAZORPAY_WEBHOOK_SECRET)) throw new ApiError(400, 'Invalid webhook signature')
    let event
    try { event = JSON.parse(req.body.toString('utf8')) } catch { throw new ApiError(400, 'Invalid webhook body') }
    if (event.event === 'payment.captured') {
      const entity = event.payload?.payment?.entity
      if (!entity?.id || !entity.order_id) throw new ApiError(400, 'Invalid payment event')
      const payment = await providerCall(() => paymentClient(env).payments.fetch(entity.id))
      await confirmCapturedPayment(payment)
    }
    res.json({ received: true })
  }
}
