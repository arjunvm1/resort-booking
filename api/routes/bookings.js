import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { Booking } from '../models/index.js'
import { auth } from '../middleware/auth.js'
import { bookingSchema, email, referenceSchema, pageSchema } from '../utils/validation.js'
import { authorizedBooking, cancelReservation, createReservation, publicBooking } from '../services/reservations.js'
import { ApiError } from '../utils/errors.js'

export function bookingRoutes(env) {
  const router = Router()
  const sensitive = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many reservation requests. Try again later.' } })
  router.post('/', sensitive, auth(env, true), async (req, res) => {
    const input = bookingSchema.parse(req.body)
    if (req.user && input.guest.email !== req.user.email) throw new ApiError(400, 'Use the email address of your signed-in account')
    res.status(201).json(await createReservation(input, env, req.user))
  })
  router.post('/lookup', sensitive, async (req, res) => {
    const input = z.object({ reference: referenceSchema, email }).strict().parse(req.body)
    const booking = await Booking.findOne({ reference: input.reference, 'guest.email': input.email })
    if (!booking) throw new ApiError(404, 'No matching reservation found')
    res.json({ booking: publicBooking(booking) })
  })
  router.get('/mine', auth(env), async (req, res) => {
    const { page, limit } = pageSchema.parse(req.query)
    const bookings = await Booking.find({ user: req.user._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
    res.json({ bookings: bookings.map(publicBooking), page, limit })
  })
  router.get('/:reference', sensitive, auth(env, true), async (req, res) => {
    referenceSchema.parse(req.params.reference)
    res.json({ booking: publicBooking(await authorizedBooking(req)) })
  })
  router.post('/:reference/cancel', sensitive, auth(env, true), async (req, res) => {
    referenceSchema.parse(req.params.reference)
    await authorizedBooking(req)
    res.json({ booking: await cancelReservation(req.params.reference) })
  })
  return router
}
