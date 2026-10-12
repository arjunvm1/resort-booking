export type Stay = {
  checkin: string
  checkout: string
  adults: number
  children: number
  quantity: number
}
export type Booking = {
  reference: string
  room: string
  stay: Stay
  guest: { name: string; email: string; phone: string; requests: string }
  status: string
  payment: string
  amount: number
  subtotal: number
  tax: number
  nightlyRate: number
  currency: string
  expiresAt: string
  refundRequired: boolean
}

