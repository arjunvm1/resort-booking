import test from 'node:test'
import assert from 'node:assert/strict'
import { uploadRoomImage, validateImage } from '../services/images.js'

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_test', SUPABASE_STORAGE_BUCKET: 'room-images' }

test('image uploads reject unsupported, mismatched, empty and oversized files', () => {
  for (const [body, type] of [[jpeg, 'image/svg+xml'], [jpeg, 'image/png'], [Buffer.alloc(0), 'image/jpeg'], [Buffer.alloc(5242881), 'image/jpeg']]) {
    assert.throws(() => validateImage(body, type), error => [400, 413].includes(error.status))
  }
})

test('Supabase upload returns a public image link and uses server credentials', async () => {
  const image = await uploadRoomImage(jpeg, 'image/jpeg', env, async (url, options) => {
    assert.match(url, /^https:\/\/example.supabase.co\/storage\/v1\/object\/room-images\/rooms\/[a-f0-9-]+\.jpg$/)
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.apikey, env.SUPABASE_SECRET_KEY)
    assert.equal(options.headers.Authorization, undefined)
    assert.equal(options.headers['Content-Type'], 'image/jpeg')
    assert.equal(options.body, jpeg)
    return { ok: true }
  })
  assert.match(image, /\/object\/public\/room-images\/rooms\//)
})

test('storage failures and missing configuration produce actionable errors', async () => {
  await assert.rejects(uploadRoomImage(jpeg, 'image/jpeg', {}), error => error.status === 503)
  await assert.rejects(uploadRoomImage(jpeg, 'image/jpeg', env, async () => ({ ok: false })), error => error.status === 502)
  await assert.rejects(uploadRoomImage(jpeg, 'image/jpeg', env, async () => { throw new Error('network') }), error => error.status === 502)
})
