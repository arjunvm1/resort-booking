import Razorpay from 'razorpay'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { ApiError } from '../utils/errors.js'

export function matchesSignature(body, signature, secret) {
  if (!secret || typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false
  const expected = createHmac('sha256', secret).update(body).digest()
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'))
}
export function paymentClient(env) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw new ApiError(503, 'Online payment is not configured. Your reservation remains unpaid.')
  const client = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
  client.api.rq.defaults.timeout = 15000
  return client
}
export async function providerCall(call) {
  try { return await call() } catch { throw new ApiError(502, 'Payment provider is unavailable. Please retry.') }
}
