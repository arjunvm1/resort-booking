import type { Stay } from "../types/booking"
import { photo } from "../utils/format"

export const hero = photo("photo-1571896349842-33c89424de2d")
export const rooms = [
  {
    id: "garden",
    name: "Garden Courtyard Room",
    category: "Garden retreat",
    price: 8500,
    guests: 2,
    size: 38,
    image: photo("photo-1611892440504-42a792e24d32"),
    description: "A light-filled hideaway opening onto your own little pocket of green.",
    pool: false,
  },
  {
    id: "lake",
    name: "Backwater View Suite",
    category: "Waterfront living",
    price: 12500,
    guests: 3,
    size: 56,
    image: photo("photo-1566665797739-1674de7a421a"),
    description: "Slow mornings, a private balcony, and uninterrupted views of the water.",
    pool: false,
  },
  {
    id: "pool",
    name: "Private Pool Villa",
    category: "Your private escape",
    price: 18500,
    guests: 4,
    size: 92,
    image: photo("photo-1576013551627-0cc20b96c2a7"),
    description: "Space to be yourself. A secluded villa with a pool all of your own.",
    pool: true,
  },
]
export const initial: Stay = {
  checkin: "2026-11-12",
  checkout: "2026-11-14",
  adults: 2,
  children: 0,
  quantity: 1,
}

