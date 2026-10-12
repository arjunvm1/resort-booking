import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { parseEnv } from '../config/env.js'
import { connectDatabase } from '../config/database.js'
import { email, password } from '../utils/validation.js'
import { User } from '../models/index.js'

try {
  const env = parseEnv(process.env)
  const input = z.object({ ADMIN_NAME: z.string().trim().min(2).default('Resort Manager'), ADMIN_EMAIL: email, ADMIN_PASSWORD: password }).parse(process.env)
  await connectDatabase(env.MONGODB_URI)
  if (await User.exists({ email: input.ADMIN_EMAIL })) throw new Error('Account already exists. This command does not promote or overwrite existing users.')
  await User.create({ name: input.ADMIN_NAME, email: input.ADMIN_EMAIL, passwordHash: await bcrypt.hash(input.ADMIN_PASSWORD, 12), role: 'admin' })
  console.log('Staff account created. Remove ADMIN_PASSWORD from .env after setup.')
} catch (error) {
  console.error('Staff setup failed:', error.name === 'ZodError' ? 'Set a valid ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in api/.env' : error.name === 'MongoServerSelectionError' ? 'Cannot connect to MongoDB' : error.message)
  process.exitCode = 1
} finally { await mongoose.disconnect() }
