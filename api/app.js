import express from "express"
import cors from "cors"
import helmet from "helmet"
import cookieParser from "cookie-parser"
import morgan from "morgan"
import { rateLimit } from "express-rate-limit"
import mongoose from "mongoose"
import { authRoutes } from "./routes/auth.js"
import { roomRoutes } from "./routes/rooms.js"
import { bookingRoutes } from "./routes/bookings.js"
import { paymentRoutes, webhookHandler } from "./routes/payments.js"
import { adminRoutes } from "./routes/admin.js"
import { ApiError, errorHandler } from "./utils/errors.js"

morgan.token("url-path", (req) => req.path)

export function createApp(env) {
  const app = express()
  app.disable("x-powered-by")
  if (env.TRUST_PROXY) app.set("trust proxy", env.TRUST_PROXY)
  app.use(helmet())
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.origins.includes(origin)) return callback(null, true)
        callback(new ApiError(403, "Origin is not allowed"))
      },
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "X-Booking-Token"],
    }),
  )
  if (env.NODE_ENV !== "test") app.use(morgan(":method :url-path :status :response-time ms"))
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store")
    next()
  })
  app.get("/", (req, res) =>
    res.json({
      status: "ok",
      service: "resort-booking-api",
      health: "/api/health",
      readiness: "/api/ready",
    }),
  )
  app.get("/api/health", (req, res) => res.json({ status: "ok", service: "resort-booking-api" }))
  app.get("/api/ready", (req, res) => {
    const connected = mongoose.connection.readyState === 1
    res.status(connected ? 200 : 503).json({ status: connected ? "ready" : "unavailable" })
  })
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many requests. Try again later." },
    }),
  )
  app.post(
    "/api/payments/webhook",
    express.raw({ type: "application/json", limit: "100kb" }),
    webhookHandler(env),
  )
  app.use(express.json({ limit: "32kb" }))
  app.use(cookieParser())
  app.use("/api", (req, res, next) => {
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("Origin")
      if ((origin && !env.origins.includes(origin)) || req.get("Sec-Fetch-Site") === "cross-site")
        throw new ApiError(403, "Cross-site request rejected")
    }
    next()
  })
  app.use("/api/auth", authRoutes(env))
  app.use("/api/rooms", roomRoutes(env))
  app.use("/api/bookings", bookingRoutes(env))
  app.use("/api/payments", paymentRoutes(env))
  app.use("/api/admin", adminRoutes(env))
  app.use((req, res) => res.status(404).json({ error: "API endpoint not found" }))
  app.use(errorHandler)
  return app
}
