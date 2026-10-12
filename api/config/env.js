import dotenv from "dotenv"
import { fileURLToPath } from "node:url"
import { z } from "zod"

dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true })

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  HOST: z.string().default("127.0.0.1"),
  MONGODB_URI: z
    .string()
    .min(1)
    .refine((v) => /^mongodb(\+srv)?:\/\//.test(v), "Use a MongoDB connection URI"),
  JWT_SECRET: z.string().min(32),
  CLIENT_URL: z.string().default("http://localhost:5173,http://127.0.0.1:5173"),
  RAZORPAY_KEY_ID: z.string().default(""),
  RAZORPAY_KEY_SECRET: z.string().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().default(""),
  SUPABASE_URL: z.union([z.literal(''), z.url().refine(v => v.startsWith('https://'), 'Use an HTTPS Supabase URL')]).default(''),
  SUPABASE_SECRET_KEY: z.string().default(''),
  SUPABASE_STORAGE_BUCKET: z.string().regex(/^[a-z0-9-]+$/).default('room-images'),
  TAX_PERCENT: z.coerce.number().min(0).max(100).default(12),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
})

export function parseEnv(input) {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new Error(
      `Invalid API configuration: ${result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`,
    )
  }
  const env = result.data
  env.origins = env.CLIENT_URL.split(",")
    .map((v) => v.trim())
    .filter(Boolean)
  for (const origin of env.origins) {
    if (new URL(origin).origin !== origin)
      throw new Error("CLIENT_URL entries must be exact origins without trailing slashes")
  }
  if (Boolean(env.RAZORPAY_KEY_ID) !== Boolean(env.RAZORPAY_KEY_SECRET)) {
    throw new Error("Set both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, or leave both empty")
  }
  return env
}
