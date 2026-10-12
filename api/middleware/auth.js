import jwt from "jsonwebtoken"
import { User } from "../models/index.js"
import { ApiError } from "../utils/errors.js"

export const cookieOptions = (env) => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
})
export const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
})

export function auth(env, optional = false) {
  return async (req, res, next) => {
    const bearer = req.get("Authorization")
    const token = bearer?.startsWith("Bearer ") ? bearer.slice(7) : req.cookies.resort_session
    if (!token && optional) return next()
    if (!token) throw new ApiError(401, "Sign in to continue")
    let payload
    try {
      payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: "resort-booking-api",
        audience: "resort-booking",
      })
    } catch {
      throw new ApiError(401, "Session expired or invalid")
    }
    req.user = await User.findById(payload.sub)
    if (!req.user) throw new ApiError(401, "Session expired or invalid")
    next()
  }
}

export function admin(req, res, next) {
  if (req.user?.role !== "admin") throw new ApiError(403, "Staff access required")
  next()
}

export function issueSession(res, user, env) {
  const token = jwt.sign({}, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: "1d",
    algorithm: "HS256",
    issuer: "resort-booking-api",
    audience: "resort-booking",
  })
  res.cookie("resort_session", token, { ...cookieOptions(env), maxAge: 86400000 })
}
