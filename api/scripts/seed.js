import mongoose from 'mongoose'
import { parseEnv } from '../config/env.js'
import { connectDatabase } from '../config/database.js'
import { Room } from '../models/index.js'

const photo = id => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=85`
const rooms = [
  { id: 'garden', name: 'Garden Courtyard Room', category: 'Garden retreat', price: 8500, guests: 2, size: 38, image: photo('photo-1611892440504-42a792e24d32'), description: 'A light-filled hideaway opening onto your own little pocket of green.', pool: false },
  { id: 'lake', name: 'Backwater View Suite', category: 'Waterfront living', price: 12500, guests: 3, size: 56, image: photo('photo-1566665797739-1674de7a421a'), description: 'Slow mornings, a private balcony, and uninterrupted views of the water.', pool: false },
  { id: 'pool', name: 'Private Pool Villa', category: 'Your private escape', price: 18500, guests: 4, size: 92, image: photo('photo-1576013551627-0cc20b96c2a7'), description: 'Space to be yourself. A secluded villa with a pool all of your own.', pool: true },
]
try {
  const env = parseEnv(process.env)
  await connectDatabase(env.MONGODB_URI)
  for (const room of rooms) await Room.updateOne({ id: room.id }, { $setOnInsert: { ...room, inventory: 5, active: true } }, { upsert: true })
  console.log('Room seed complete. Existing room settings were preserved.')
} catch (error) {
  console.error('Seed failed:', error.name === 'MongoServerSelectionError' ? 'Cannot connect to MongoDB' : error.message)
  process.exitCode = 1
} finally { await mongoose.disconnect() }
