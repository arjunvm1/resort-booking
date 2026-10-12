import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { randomBytes } from 'node:crypto'
import { parseEnv } from '../config/env.js'
import { connectDatabase } from '../config/database.js'
import { Booking, Room, User } from '../models/index.js'
import { createReservation, cancelReservation, confirmCapturedPayment } from '../services/reservations.js'
import { createApp } from '../app.js'

test('MongoDB transactions and authenticated booking lifecycle', { skip: process.env.RUN_DB_TESTS !== '1', timeout: 60000 }, async t => {
  const env = parseEnv({ ...process.env, NODE_ENV: 'test' })
  const dbName = `resort_booking_test_${randomBytes(8).toString('hex')}`
  const cleanupTimeout = setTimeout(() => process.exit(1), 65000).unref()
  t.after(async () => {
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName && /^resort_booking_test_[a-f0-9]{16}$/.test(dbName)) {
      await mongoose.connection.dropDatabase()
    }
    await mongoose.disconnect()
    clearTimeout(cleanupTimeout)
  })
  await connectDatabase(env.MONGODB_URI, dbName)
  await Room.create({ id: 'garden', name: 'Test room', price: 8500, guests: 2, inventory: 1 })
  const input = { room: 'garden', stay: { checkin: '2099-11-12', checkout: '2099-11-14', adults: 2, children: 0, quantity: 1 }, guest: { name: 'Test Guest', email: 'guest@example.com', phone: '+91 9876543210', requests: '' } }
  const attempts = await Promise.allSettled([createReservation(input, env), createReservation(input, env)])
  assert.equal(attempts.filter(r => r.status === 'fulfilled').length, 1)
  const rejected = attempts.find(r => r.status === 'rejected')
  assert.equal(rejected.reason.status, 409)
  const first = attempts.find(r => r.status === 'fulfilled').value
  assert.equal(first.booking.amount, 1904000)
  await cancelReservation(first.booking.reference)
  const second = await createReservation(input, env)
  await Booking.updateOne({ reference: second.booking.reference }, { $set: { orderId: 'order_test' } })
  const payment = { id: 'pay_test', order_id: 'order_test', status: 'captured', amount: second.booking.amount, currency: 'INR' }
  const confirmed = await confirmCapturedPayment(payment)
  assert.equal(confirmed.status, 'Confirmed')
  assert.equal(confirmed.payment, 'Paid')
  assert.equal((await confirmCapturedPayment(payment)).status, 'Confirmed')
  await assert.rejects(createReservation(input, env), e => e.status === 409)
  const cancelled = await cancelReservation(second.booking.reference)
  assert.equal(cancelled.refundRequired, true)
  assert.equal((await confirmCapturedPayment(payment)).status, 'Cancelled')

  // Expired holds free capacity; late payments cannot displace a newer hold.
  const expired = await createReservation(input, env)
  await Booking.updateOne({ reference: expired.booking.reference }, { $set: { orderId: 'order_late', expiresAt: new Date(0) } })
  const current = await createReservation(input, env)
  const late = await confirmCapturedPayment({ ...payment, id: 'pay_late', order_id: 'order_late' })
  assert.equal(late.status, 'Payment review')
  assert.equal(late.refundRequired, true)
  await cancelReservation(current.booking.reference)

  const server = createApp(env).listen(0, '127.0.0.1')
  await new Promise(resolve => server.once('listening', resolve))
  t.after(() => { server.close(); server.closeAllConnections() })
  const base = `http://127.0.0.1:${server.address().port}`
  const post = (path, body, extraHeaders = {}) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extraHeaders }, body: JSON.stringify(body) })
  const register = await post('/api/auth/register', { name: 'Guest User', email: 'user@example.com', password: 'test-password-1234' })
  assert.equal(register.status, 201)
  const cookie = register.headers.get('set-cookie').split(';')[0]
  const authHeaders = { Cookie: cookie }
  const newRoom = { id: 'ocean-suite', name: 'Ocean Suite', category: 'Ocean view', description: 'A peaceful suite.', image: 'https://example.com/room.jpg', price: 10000, guests: 3, size: 50, pool: true, inventory: 2, active: true }
  assert.equal((await register.json()).user.role, 'guest')
  assert.equal((await post('/api/admin/rooms', newRoom)).status, 401)
  assert.equal((await post('/api/admin/rooms', newRoom, authHeaders)).status, 403)
  assert.equal((await fetch(base + '/api/admin/bookings', { headers: authHeaders })).status, 403)
  assert.equal((await post('/api/auth/register', { name: 'Injected User', email: 'admin@example.com', password: 'test-password-1234', role: 'admin' })).status, 400)
  const reservation = await post('/api/bookings', { ...input, guest: { ...input.guest, email: 'user@example.com' } }, authHeaders)
  assert.equal(reservation.status, 201)
  const record = await reservation.json()
  const lookup = await post('/api/bookings/lookup', { reference: record.booking.reference, email: 'user@example.com' })
  assert.equal(lookup.status, 200)
  assert.equal((await post(`/api/bookings/${record.booking.reference}/cancel`, {})).status, 403)
  assert.equal((await post(`/api/bookings/${record.booking.reference}/cancel`, {}, authHeaders)).status, 200)
  const user = await User.findOne({ email: 'user@example.com' })
  user.role = 'admin'
  await user.save()
  const createdRoom = await post('/api/admin/rooms', newRoom, authHeaders)
  assert.equal(createdRoom.status, 201)
  assert.deepEqual((await createdRoom.json()).room, newRoom)
  assert.equal((await post('/api/admin/rooms', newRoom, authHeaders)).status, 409)
  assert.equal((await post('/api/admin/rooms', { ...newRoom, id: 'invalid-room', price: -1 }, authHeaders)).status, 400)
  const listedRooms = await (await fetch(base + '/api/rooms')).json()
  assert.ok(listedRooms.rooms.some(room => room.id === newRoom.id))
  const detail = await (await fetch(base + '/api/rooms/ocean-suite')).json()
  assert.deepEqual(detail.room, newRoom)
  const available = await (await fetch(base + '/api/rooms/availability?' + new URLSearchParams(input.stay))).json()
  assert.ok(available.rooms.some(room => room.id === newRoom.id))
  assert.equal((await fetch(base + '/api/admin/overview', { headers: authHeaders })).status, 200)
  assert.equal((await post('/api/auth/login', { email: 'user@example.com', password: 'incorrect' })).status, 401)
  assert.equal((await post('/api/auth/login', { email: 'user@example.com', password: 'test-password-1234' })).status, 200)
})
