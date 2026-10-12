import { Link, useNavigate } from "react-router-dom"
import { AddRoom } from "./AddRoom"
import { useEffect, useState } from "react"
import { api, ApiError } from "../lib/api"
import type { ApiRoom, User } from "../lib/api"
import type { Booking } from "../types/booking"
import { RoomForm } from "../components/rooms/RoomForm"
import { money, date } from "../utils/format"

type Overview = {
  total: number
  confirmed: number
  pending: number
  refunds: number
  revenue: number
}
export function Admin({ section = 'Overview' }: { section?: 'Overview' | 'Rooms' | 'Add room' | 'Bookings' }) {
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const tab = section
  const [overview, setOverview] = useState<Overview | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [rooms, setRooms] = useState<ApiRoom[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    void api<{ user: User }>("/auth/me")
      .then((data) => {
        if (active) setUser(data.user)
      })
      .catch((error) => {
        if (active && (!(error instanceof ApiError) || error.status !== 401))
          setError(error.message)
      })
      .finally(() => {
        if (active) setChecking(false)
      })
    return () => {
      active = false
    }
  }, [])
  useEffect(() => {
    if (user?.role !== "admin") return
    let active = true
    const load = async () => {
      await Promise.resolve()
      if (!active) return
      setBusy(true)
      setError('')
      try {
        if (tab === 'Add room') return
        if (tab === "Overview") {
          const data = await api<Overview>("/admin/overview")
          if (active) setOverview(data)
        } else if (tab === "Rooms") {
          const data = await api<{ rooms: ApiRoom[] }>("/admin/rooms")
          if (active) setRooms(data.rooms)
        } else {
          const data = await api<{ bookings: Booking[]; total: number }>(
            `/admin/bookings?page=${page}&limit=20`,
          )
          if (active) {
            setBookings(data.bookings)
            setTotal(data.total)
          }
        }
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Could not load staff data.")
      } finally {
        if (active) setBusy(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [user, tab, page, revision])
  const logout = async () => {
    setBusy(true)
    try {
      await api("/auth/logout", { method: "POST" })
      setUser(null)
      setPassword("")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign-out failed.")
    } finally {
      setBusy(false)
    }
  }
  if (checking)
    return (
      <main className="section page narrow">
        <p role="status">Checking staff session...</p>
      </main>
    )
  if (!user || user.role !== "admin")
    return (
      <main className="section page narrow">
        <div className="eyebrow">VANA · STAFF PORTAL</div>
        <h1>
          Welcome <em>back.</em>
        </h1>
        {error && (
          <p
            className="error"
            role="alert"
          >
            {error}
          </p>
        )}
        {user ? (
          <div className="form-panel">
            <p>Your account does not have staff access.</p>
            <button
              className="button"
              disabled={busy}
              onClick={() => void logout()}
            >
              Sign out
            </button>
          </div>
        ) : (
          <form
            className="form-panel"
            onSubmit={async (e) => {
              e.preventDefault()
              setBusy(true)
              setError("")
              try {
                const data = await api<{ user: User }>("/auth/login", {
                  method: "POST",
                  body: JSON.stringify({ email, password }),
                })
                setUser(data.user)
                setPassword("")
              } catch (error) {
                setError(error instanceof Error ? error.message : "Sign-in failed.")
              } finally {
                setBusy(false)
              }
            }}
          >
            <label>
              Email
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button
              className="button"
              disabled={busy}
            >
              {busy ? "Signing in..." : "Sign in"}
            </button>
          </form>
        )}
      </main>
    )
  return (
    <main className="admin-layout">
      <aside className="sidebar">
        <div className="eyebrow">RESORT OPERATIONS</div>
        {([
          ['Overview', '/admin'], ['Rooms', '/admin/rooms'],
          ['Add room', '/admin/rooms/new'], ['Bookings', '/admin/bookings'],
        ] as const).map(([name, path]) => <Link key={name} to={path} className={tab === name ? 'selected' : ''} aria-current={tab === name ? 'page' : undefined} onClick={() => setNotice('')}>{name}</Link>)}
        <Link to="/">View website</Link>
        <button
          disabled={busy}
          onClick={() => void logout()}
        >
          Sign out
        </button>
      </aside>
      <section className="admin-main">
        <div className="section-heading">
          <h2>{tab}</h2>
          <span className="badge">{user.name}</span>
        </div>
        {error && (
          <p
            className="error"
            role="alert"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            className="notice"
            role="status"
          >
            {notice}
          </p>
        )}
        {busy && <p role="status">Loading...</p>}
        {!busy && tab === "Overview" && overview && (
          <div className="stats">
            {[
              ["Total reservations", overview.total],
              ["Confirmed", overview.confirmed],
              ["Active holds", overview.pending],
              ["Refunds requiring review", overview.refunds],
              ["Confirmed revenue", money(overview.revenue / 100)],
            ].map(([name, value]) => (
              <div key={name}>
                <span>{name}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        )}
        {tab === 'Add room' && <AddRoom onSaved={() => {
          setNotice('Room added.')
          setRevision(v => v + 1)
          navigate('/admin/rooms')
        }} />}
        {tab === "Rooms" && (
          <>
            <Link className="button" to="/admin/rooms/new" onClick={() => setNotice('')}>Add room</Link>
            <p>Manage the details and availability of your existing rooms.</p>
            {!busy && rooms.length === 0 && <p>No room types yet. Use Add room to create your first room.</p>}
            {!busy &&
              rooms.map((room) => (
                <RoomForm
                  key={`${room.id}-${revision}`}
                  room={room}
                  onSaved={() => {
                    setNotice("Room details saved.")
                    setRevision((v) => v + 1)
                  }}
                />
              ))}
          </>
        )}
        {!busy && tab === "Bookings" && (
          <>
            {bookings.length === 0 && <p className="empty">No reservations yet.</p>}
            {bookings.map((booking) => (
              <div
                className="form-panel"
                key={booking.reference}
              >
                <h3>{booking.reference}</h3>
                <p>
                  {booking.guest.name} · {booking.guest.email} · {booking.guest.phone}
                </p>
                <p>
                  {booking.room} · {date(booking.stay.checkin)} – {date(booking.stay.checkout)}
                </p>
                <p>
                  {booking.status} · {booking.payment} · {money(booking.amount / 100)}
                </p>
                {booking.guest.requests && <p>{booking.guest.requests}</p>}
                {booking.refundRequired && (
                  <p className="notice">
                    Refund requires processing in Razorpay and staff follow-up.
                  </p>
                )}
                <button
                  className="button secondary"
                  disabled={booking.status === "Cancelled"}
                  onClick={async () => {
                    if (
                      !confirm("Cancel this reservation? Paid refunds require separate processing.")
                    )
                      return
                    setBusy(true)
                    setError("")
                    try {
                      await api(`/admin/bookings/${booking.reference}/cancel`, { method: "POST" })
                      setNotice("Reservation cancelled.")
                      setRevision((v) => v + 1)
                    } catch (error) {
                      setError(error instanceof Error ? error.message : "Cancellation failed.")
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Cancel reservation
                </button>
              </div>
            ))}
            <div className="actions">
              <button
                className="button secondary"
                disabled={page <= 1}
                onClick={() => setPage((v) => v - 1)}
              >
                Previous
              </button>
              <span>Page {page}</span>
              <button
                className="button secondary"
                disabled={page * 20 >= total}
                onClick={() => setPage((v) => v + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  )
}
