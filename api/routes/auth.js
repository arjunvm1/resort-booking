import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { User } from '../models/index.js'
import { auth, cookieOptions, issueSession, publicUser } from '../middleware/auth.js'
import { email, password } from '../utils/validation.js'
import { ApiError } from '../utils/errors.js'

export function authRoutes(env) {
  const router = Router()
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many sign-in attempts. Try again later.' } })
  const dummyHash = bcrypt.hashSync('unusable-dummy-password-for-comparison', 12)
  router.post('/register', limiter, async (req, res) => {
    const input = z.object({ name: z.string().trim().min(2).max(100), email, password }).strict().parse(req.body)
    const user = await User.create({ name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12), role: 'guest' })
    issueSession(res, user, env)
    res.status(201).json({ user: publicUser(user) })
  })
  router.post('/login', limiter, async (req, res) => {
    const input = z.object({ email, password: z.string().min(1).max(200) }).strict().parse(req.body)
    const user = await User.findOne({ email: input.email }).select('+passwordHash')
    const matches = await bcrypt.compare(input.password, user?.passwordHash || dummyHash)
    if (!user || !matches) throw new ApiError(401, 'Invalid email or password')
    issueSession(res, user, env)
    res.json({ user: publicUser(user) })
  })
  router.get('/me', auth(env), (req, res) => res.json({ user: publicUser(req.user) }))
  router.post('/logout', (req, res) => {
    res.clearCookie('resort_session', cookieOptions(env))
    res.json({ message: 'Signed out' })
  })
  return router
}
