import type { Booking, Stay } from "../types/booking"

export type Quote = {
  amount: number
  subtotal: number
  tax: number
  nightlyRate: number
  currency: string
}
export type ApiRoom = {
  id: string
  name: string
  category: string
  description: string
  image: string
  imageUrls?: string[]
  price: number
  guests: number
  size: number
  pool: boolean
  inventory: number
  active: boolean
  available?: number
  quote?: Quote
}
export type User = { id: string; name: string; email: string; role: "guest" | "admin" }
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json")
  let response: Response
  try {
    response = await fetch(`/api${path}`, { ...options, headers, credentials: "include" })
  } catch {
    throw new ApiError("Cannot reach the resort service. Please try again.", 0)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok)
    throw new ApiError(
      data?.details?.length
        ? data.details.map((detail: { field?: string; message: string }) => `${detail.field ? `${detail.field}: ` : ''}${detail.message}`).join('; ')
        : data?.error || "The resort service is unavailable.",
      response.status,
    )
  return data as T
}
export const availability = (stay: Stay) =>
  api<{ rooms: ApiRoom[] }>(
    `/rooms/availability?${new URLSearchParams(Object.entries(stay).map(([k, v]) => [k, String(v)]))}`,
  )
export const bookingHeaders = (reference: string): Record<string, string> => {
  const token = sessionStorage.getItem(`vana-token:${reference}`)
  return token ? { "X-Booking-Token": token } : {}
}
export const cancelBooking = (reference: string) =>
  api<{ booking: Booking }>(`/bookings/${reference}/cancel`, {
    method: "POST",
    headers: bookingHeaders(reference),
  })

type PaymentResult = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}
type RazorpayOptions = {
  key: string
  order_id: string
  amount: number
  currency: string
  name: string
  prefill: { name: string; email: string; contact: string }
  handler: (result: PaymentResult) => void
  modal: { ondismiss: () => void }
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void
      on: (event: string, callback: () => void) => void
    }
  }
}
let checkoutScript: Promise<void> | undefined
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve()
  if (!checkoutScript)
    checkoutScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script")
      script.src = "https://checkout.razorpay.com/v1/checkout.js"
      script.onload = () =>
        window.Razorpay ? resolve() : reject(new Error("Payment checkout could not load."))
      script.onerror = () => reject(new Error("Payment checkout could not load. Please retry."))
      document.head.appendChild(script)
    }).catch((error) => {
      checkoutScript = undefined
      throw error
    })
  return checkoutScript
}
export async function payForBooking(booking: Booking): Promise<Booking> {
  await loadCheckout()
  const { keyId, order } = await api<{
    keyId: string
    order: { id: string; amount: number; currency: string }
  }>(`/payments/${booking.reference}/order`, {
    method: "POST",
    headers: bookingHeaders(booking.reference),
  })
  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay!({
      key: keyId,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "Vana Resort",
      prefill: {
        name: booking.guest.name,
        email: booking.guest.email,
        contact: booking.guest.phone,
      },
      handler(result) {
        void api<{ booking: Booking }>(`/payments/${booking.reference}/verify`, {
          method: "POST",
          headers: bookingHeaders(booking.reference),
          body: JSON.stringify(result),
        })
          .then((data) => resolve(data.booking))
          .catch(() =>
            reject(
              new Error(
                "Payment confirmation is pending. Check your reservation status before trying another payment.",
              ),
            ),
          )
      },
      modal: {
        ondismiss: () =>
          reject(
            new Error(
              "Payment checkout closed. Check your reservation status if a payment was attempted.",
            ),
          ),
      },
    })
    checkout.open()
  })
}
