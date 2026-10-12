import { z } from "zod"

export const email = z.string().trim().toLowerCase().email().max(254)
export const password = z
  .string()
  .min(10)
  .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "Password must be at most 72 UTF-8 bytes")
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
  }, "Invalid calendar date")
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
export const staySchema = z
  .object({
    checkin: day,
    checkout: day,
    adults: z.coerce.number().int().min(1).max(100),
    children: z.coerce.number().int().min(0).max(100),
    quantity: z.coerce.number().int().min(1).max(20),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (s.checkin < today())
      ctx.addIssue({ code: "custom", path: ["checkin"], message: "Check-in cannot be in the past" })
    const nights = (Date.parse(s.checkout) - Date.parse(s.checkin)) / 86400000
    if (!(nights >= 1 && nights <= 30))
      ctx.addIssue({
        code: "custom",
        path: ["checkout"],
        message: "Stay must be between 1 and 30 nights",
      })
  })
export const bookingSchema = z
  .object({
    room: z.string().regex(/^[a-z0-9-]{1,60}$/),
    stay: staySchema,
    guest: z
      .object({
        name: z.string().trim().min(2).max(100),
        email,
        phone: z
          .string()
          .trim()
          .regex(/^[+0-9 ()-]{10,18}$/),
        requests: z.string().trim().max(2000).default(""),
      })
      .strict(),
  })
  .strict()
export const roomSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,60}$/),
    name: z.string().trim().min(2).max(150),
    category: z.string().max(150).default(""),
    description: z.string().max(3000).default(""),
    image: z.url().refine((v) => v.startsWith("https://"), "Use an HTTPS image URL"),
    imageUrls: z.array(z.url().refine(v => v.startsWith('https://'), 'Use HTTPS image URLs')).min(1).max(6).optional(),
    price: z.number().int().min(1).max(1000000),
    guests: z.number().int().min(1).max(20),
    size: z.number().min(1).max(10000),
    pool: z.boolean().default(false),
    inventory: z.number().int().min(0).max(1000),
    active: z.boolean().default(true),
  })
  .strict()
export const referenceSchema = z.string().regex(/^VANA-[A-F0-9]{16}$/)
export const pageSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
