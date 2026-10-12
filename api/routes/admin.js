import { Router, raw } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'
import { auth, admin } from '../middleware/auth.js'
import { Booking, Room } from '../models/index.js'
import { roomSchema, pageSchema, referenceSchema, today } from '../utils/validation.js'
import { cancelReservation, publicBooking } from '../services/reservations.js'
import { publicRoom } from './rooms.js'
import { ApiError } from '../utils/errors.js'
import { uploadRoomImage, maxImageBytes } from '../services/images.js'

export function adminRoutes(env) {
  const router = Router()
  router.use(auth(env), admin)
  router.post('/rooms/image', raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: maxImageBytes }), async (req, res) => {
    const image = await uploadRoomImage(req.body, req.get('Content-Type')?.split(';')[0].trim().toLowerCase(), env)
    res.status(201).json({ image })
  })
  router.get('/overview', async (req, res) => {
    const [total, confirmed, pending, refunds, revenue] = await Promise.all([
      Booking.countDocuments(), Booking.countDocuments({ status: 'Confirmed' }),
      Booking.countDocuments({ status: 'Pending confirmation', expiresAt: { $gt: new Date() } }),
      Booking.countDocuments({ refundRequired: true }),
      Booking.aggregate([{ $match: { payment: 'Paid', status: 'Confirmed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ])
    res.json({ total, confirmed, pending, refunds, revenue: revenue[0]?.total ?? 0, currency: 'INR' })
  })
  router.get('/bookings', async (req, res) => {
    const { page, limit } = pageSchema.parse(req.query)
    const status = z.enum(['Pending confirmation', 'Confirmed', 'Cancelled', 'Payment review']).optional().parse(req.query.status)
    const filter = status ? { status } : {}
    const [bookings, total] = await Promise.all([Booking.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Booking.countDocuments(filter)])
    res.json({ bookings: bookings.map(publicBooking), total, page, limit })
  })
  router.post('/bookings/:reference/cancel', async (req, res) => {
    referenceSchema.parse(req.params.reference)
    res.json({ booking: await cancelReservation(req.params.reference) })
  })
  router.get('/rooms', async (req, res) => res.json({ rooms: (await Room.find().sort({ price: 1 })).map(publicRoom) }))
  router.post('/rooms', async (req, res) => res.status(201).json({ room: publicRoom(await Room.create(roomSchema.parse(req.body))) }))
  router.patch('/rooms/:id', async (req, res) => {
    const input = roomSchema.omit({ id: true }).partial().parse(req.body)
    let result
    await mongoose.connection.transaction(async session => {
      const room = await Room.findOneAndUpdate({ id: req.params.id }, { $inc: { revision: 1 } }, { returnDocument: 'after', session })
      if (!room) throw new ApiError(404, 'Room type not found')
      if (input.inventory !== undefined && input.inventory < room.inventory) {
        const allocated = await Booking.exists({ room: room.id, 'stay.checkout': { $gt: today() }, $or: [{ status: 'Confirmed' }, { status: 'Pending confirmation', expiresAt: { $gt: new Date() } }] }).session(session)
        if (allocated) throw new ApiError(409, 'Inventory cannot be reduced while future reservations or holds exist')
      }
      Object.assign(room, input)
      await room.save({ session })
      result = publicRoom(room)
    })
    res.json({ room: result })
  })
  return router
}
