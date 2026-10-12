import { Router } from 'express'
import { Room } from '../models/index.js'
import { staySchema } from '../utils/validation.js'
import { availability, quote } from '../services/reservations.js'
import { ApiError } from '../utils/errors.js'

export const publicRoom = r => ({ id: r.id, name: r.name, category: r.category, description: r.description, image: r.image, ...(r.imageUrls?.length ? { imageUrls: r.imageUrls } : {}), price: r.price, guests: r.guests, size: r.size, pool: r.pool, inventory: r.inventory, active: r.active })
export function roomRoutes(env) {
  const router = Router()
  router.get('/', async (req, res) => {
    const rooms = await Room.find({ active: true }).sort({ price: 1 }).lean()
    res.json({ rooms: rooms.map(publicRoom) })
  })
  router.get('/availability', async (req, res) => {
    const stay = staySchema.parse(req.query)
    const rooms = await Room.find({ active: true }).sort({ price: 1 }).lean()
    const results = []
    for (const room of rooms) {
      const available = await availability(room, stay)
      if (room.guests * stay.quantity >= stay.adults + stay.children && available >= stay.quantity) results.push({ ...publicRoom(room), available, quote: quote(room, stay, env.TAX_PERCENT) })
    }
    res.json({ rooms: results })
  })
  router.get('/:id', async (req, res) => {
    const room = await Room.findOne({ id: req.params.id, active: true }).lean()
    if (!room) throw new ApiError(404, 'Room type not found')
    res.json({ room: publicRoom(room) })
  })
  return router
}
