import test from "node:test"
import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { parseEnv } from "../config/env.js"
import { staySchema, bookingSchema, roomSchema, password } from "../utils/validation.js"
import { publicRoom } from '../routes/rooms.js'
import { quote, availableInventory, publicBooking } from "../services/reservations.js"
import { matchesSignature } from "../services/payments.js"
import { createApp } from "../app.js"

const stay = { checkin: "2099-11-12", checkout: "2099-11-14", adults: 2, children: 0, quantity: 1 }
const env = parseEnv({
  NODE_ENV: "test",
  MONGODB_URI: "mongodb://127.0.0.1/test",
  JWT_SECRET: "test-secret-".repeat(5),
  RAZORPAY_WEBHOOK_SECRET: "webhook-test-secret",
})

test('room galleries validate photo limits and preserve old single-photo rooms', () => {
  const room = { id: 'suite', name: 'Test Suite', image: 'https://example.com/cover.jpg', price: 10000, guests: 2, size: 40, inventory: 1 }
  assert.equal(roomSchema.safeParse(room).success, true)
  const imageUrls = [room.image, 'https://example.com/interior.jpg']
  assert.deepEqual(publicRoom(roomSchema.parse({ ...room, imageUrls })).imageUrls, imageUrls)
  assert.equal('imageUrls' in publicRoom(room), false)
  for (const urls of [[], Array(7).fill(room.image), ['http://example.com/photo.jpg']]) {
    assert.equal(roomSchema.safeParse({ ...room, imageUrls: urls }).success, false)
  }
})

test("configuration fails clearly when required settings are missing", () => {
  assert.throws(() => parseEnv({}), /MONGODB_URI.*JWT_SECRET/)
  assert.throws(() => parseEnv({ ...env, RAZORPAY_KEY_ID: "key" }), /both/)
  assert.throws(() => parseEnv({ ...env, CLIENT_URL: "http://localhost:5173/" }), /exact origins/)
})

test('production listens on public interfaces and honors the platform port', () => {
  const input = { ...env, HOST: undefined, NODE_ENV: 'production', PORT: '10000' }
  const production = parseEnv(input)
  assert.equal(production.HOST, '0.0.0.0')
  assert.equal(production.PORT, 10000)
  assert.equal(parseEnv({ ...input, NODE_ENV: 'development' }).HOST, '127.0.0.1')
  assert.equal(parseEnv({ ...input, HOST: '127.0.0.1' }).HOST, '127.0.0.1')
  const render = parseEnv({ ...input, RENDER: 'true', HOST: '127.0.0.1', NODE_ENV: 'development' })
  assert.equal(render.HOST, '0.0.0.0')
  assert.equal(render.PORT, 10000)
})
test("stay validation rejects impossible, past, reversed and excessively long dates", () => {
  assert.equal(staySchema.safeParse(stay).success, true)
  for (const change of [
    { checkin: "2099-02-30" },
    { checkin: "2000-01-01" },
    { checkout: stay.checkin },
    { checkout: "2100-01-01" },
    { quantity: 0 },
    { adults: 1.5 },
  ])
    assert.equal(staySchema.safeParse({ ...stay, ...change }).success, false)
})
test("booking validation prevents client price/status/role injection", () => {
  const input = {
    room: "garden",
    stay,
    guest: { name: "Test Guest", email: "GUEST@EXAMPLE.COM", phone: "+91 9876543210" },
  }
  assert.equal(bookingSchema.parse(input).guest.email, "guest@example.com")
  for (const change of [{ amount: 1 }, { status: "Confirmed" }, { role: "admin" }])
    assert.equal(bookingSchema.safeParse({ ...input, ...change }).success, false)
})
test("bcrypt password limit counts bytes, including unicode", () => {
  assert.equal(password.safeParse("a".repeat(72)).success, true)
  assert.equal(password.safeParse("a".repeat(73)).success, false)
  assert.equal(password.safeParse("😀".repeat(19)).success, false)
})
test("quotes use integer paise and server-provided rates", () => {
  assert.deepEqual(quote({ price: 8500 }, stay, 12), {
    nights: 2,
    subtotal: 1700000,
    tax: 204000,
    amount: 1904000,
    nightlyRate: 8500,
    currency: "INR",
  })
})
test("inventory counts concurrent nightly usage, not unrelated nights together", () => {
  const bookings = [
    { stay: { checkin: "2099-11-12", checkout: "2099-11-13", quantity: 2 } },
    { stay: { checkin: "2099-11-13", checkout: "2099-11-14", quantity: 2 } },
  ]
  assert.equal(availableInventory({ inventory: 5 }, stay, bookings), 3)
  bookings.push({ stay: { ...stay, quantity: 3 } })
  assert.equal(availableInventory({ inventory: 5 }, stay, bookings), 0)
})
test("signatures reject malformed and tampered checkout/webhook data", () => {
  const body = "order_123|pay_123"
  const secret = "test-secret"
  const signature = createHmac("sha256", secret).update(body).digest("hex")
  assert.equal(matchesSignature(body, signature, secret), true)
  assert.equal(matchesSignature("order_999|pay_123", signature, secret), false)
  assert.equal(matchesSignature(body, "xx".repeat(32), secret), false)
  assert.equal(matchesSignature(body, signature, ""), false)
})
test("booking serialization does not expose authorization or provider secrets", () => {
  const result = publicBooking({
    reference: "test",
    tokenHash: "secret",
    orderId: "order",
    paymentId: "pay",
    user: "user",
  })
  for (const key of ["tokenHash", "orderId", "paymentId", "user"])
    assert.equal(key in result, false)
})

test("HTTP security, validation and error responses work without a database", async (t) => {
  const server = createApp(env).listen(0, "127.0.0.1")
  await new Promise((resolve) => server.once("listening", resolve))
  t.after(() => {
    server.close()
    server.closeAllConnections()
  })
  const base = `http://127.0.0.1:${server.address().port}`
  await t.test("health and readiness are distinct", async () => {
    const health = await fetch(base + "/api/health")
    assert.equal(health.status, 200)
    assert.equal((await health.json()).status, "ok")
    assert.equal(health.headers.get("x-powered-by"), null)
    assert.equal(health.headers.get("x-content-type-options"), "nosniff")
    assert.equal((await fetch(base + "/api/ready")).status, 503)
  })
  await t.test("unknown routes return JSON 404", async () => {
    const response = await fetch(base + "/api/missing")
    assert.equal(response.status, 404)
    assert.equal((await response.json()).error, "API endpoint not found")
  })
  await t.test("allowed CORS origins receive credential headers", async () => {
    const response = await fetch(base + "/api/health", {
      headers: { Origin: "http://localhost:5173" },
    })
    assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173")
    assert.equal(response.headers.get("access-control-allow-credentials"), "true")
  })
  await t.test("cross-origin mutations are rejected", async () => {
    assert.equal(
      (
        await fetch(base + "/api/auth/logout", {
          method: "POST",
          headers: { Origin: "https://evil.example" },
        })
      ).status,
      403,
    )
    assert.equal(
      (
        await fetch(base + "/api/auth/logout", {
          method: "POST",
          headers: { "Sec-Fetch-Site": "cross-site" },
        })
      ).status,
      403,
    )
  })
  await t.test("malformed JSON and invalid requests return 400", async () => {
    const malformed = await fetch(base + "/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    })
    assert.equal(malformed.status, 400)
    const invalid = await fetch(base + "/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
    assert.equal(invalid.status, 400)
    assert.equal((await invalid.json()).error, "Invalid request")
  })
  await t.test("admin and account routes require valid authentication", async () => {
    assert.equal((await fetch(base + "/api/admin/bookings")).status, 401)
    assert.equal(
      (await fetch(base + "/api/auth/me", { headers: { Authorization: "Bearer invalid" } })).status,
      401,
    )
  })
  await t.test("webhook checks the raw body signature before processing", async () => {
    const body = JSON.stringify({ event: "unhandled.event" })
    const valid = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex")
    const send = (signature) =>
      fetch(base + "/api/payments/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Razorpay-Signature": signature },
        body,
      })
    assert.equal((await send("bad")).status, 400)
    assert.equal((await send(valid)).status, 200)
  })
  await t.test("logout clears the HTTP-only session cookie", async () => {
    const response = await fetch(base + "/api/auth/logout", { method: "POST" })
    assert.equal(response.status, 200)
    assert.match(response.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/i)
  })
})
