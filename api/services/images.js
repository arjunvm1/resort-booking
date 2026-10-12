import { randomUUID } from 'node:crypto'
import { ApiError } from '../utils/errors.js'

export const imageTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
export const maxImageBytes = 5 * 1024 * 1024

export function validateImage(body, type) {
  if (!Buffer.isBuffer(body) || !body.length) throw new ApiError(400, 'Choose a room photo.')
  if (body.length > maxImageBytes) throw new ApiError(413, 'Room photos must be 5 MB or smaller.')
  const matches = type === 'image/jpeg' ? body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    : type === 'image/png' ? body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : type === 'image/webp' ? body.toString('ascii', 0, 4) === 'RIFF' && body.toString('ascii', 8, 12) === 'WEBP'
    : false
  if (!matches) throw new ApiError(400, 'Choose a valid JPEG, PNG, or WebP image.')
}

export async function uploadRoomImage(body, type, env, request = fetch) {
  validateImage(body, type)
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new ApiError(503, 'Photo uploads need SUPABASE_URL and SUPABASE_SECRET_KEY in the API configuration.')
  }
  const base = env.SUPABASE_URL.replace(/\/$/, '')
  const path = `${encodeURIComponent(env.SUPABASE_STORAGE_BUCKET)}/rooms/${randomUUID()}.${imageTypes[type]}`
  const headers = { apikey: env.SUPABASE_SECRET_KEY, 'Content-Type': type, 'x-upsert': 'false' }
  // Legacy service_role keys are JWTs; new sb_secret keys use only the apikey header.
  if (!env.SUPABASE_SECRET_KEY.startsWith('sb_secret_')) headers.Authorization = `Bearer ${env.SUPABASE_SECRET_KEY}`
  let response
  try {
    response = await request(`${base}/storage/v1/object/${path}`, {
      method: 'POST', headers, body, signal: AbortSignal.timeout(30000),
    })
  } catch { throw new ApiError(502, 'Could not reach image storage. Try uploading again.') }
  if (!response.ok) throw new ApiError(502, 'Photo upload failed. Check the Supabase key and public room-images bucket configuration.')
  return `${base}/storage/v1/object/public/${path}`
}
