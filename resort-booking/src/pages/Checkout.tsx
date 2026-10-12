import { ArrowRight, ShieldCheck, CalendarDays } from "lucide-react"
import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import type { Booking, Stay } from "../types/booking"
import { useRooms } from "../lib/useRooms"
import { Summary } from "../components/booking/Summary"
import { api, availability, payForBooking } from "../lib/api"
import type { ApiRoom } from "../lib/api"

export function Checkout({ stay }: { stay: Stay }) {
  const { id } = useParams()
  const [liveRoom, setLiveRoom] = useState<ApiRoom | null>(null)
  const { rooms, loading: loadingRoom, error: roomError } = useRooms(id)
  const room = liveRoom || rooms.find((r) => r.id === id)
  const [step, setStep] = useState(1)
  const [accepted, setAccepted] = useState(false)
  const [payment, setPayment] = useState("idle")
  const [guest, setGuest] = useState({ name: "", email: "", phone: "", requests: "" })
  const [booking, setBooking] = useState<Booking | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    setLiveRoom(null)
    void availability(stay)
      .then((data) => {
        if (!active) return
        const available = data.rooms.find((r) => r.id === id)
        setLiveRoom(available || null)
        setError(available ? "" : "This room is unavailable for your selected stay.")
      })
      .catch((error) => {
        if (active) setError(error.message)
      })
    return () => {
      active = false
    }
  }, [id, stay])
  const reserve = async () => {
    if (!room || !liveRoom) return
    setBusy(true)
    setError("")
    try {
      const result = await api<{ booking: Booking; bookingToken: string }>("/bookings", {
        method: "POST",
        body: JSON.stringify({ room: room.id, stay, guest }),
      })
      sessionStorage.setItem(`vana-token:${result.booking.reference}`, result.bookingToken)
      setBooking(result.booking)
      setStep(3)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Reservation could not be created.")
    } finally {
      setBusy(false)
    }
  }
  const pay = async () => {
    if (!booking) return
    setPayment("processing")
    setError("")
    try {
      setBooking(await payForBooking(booking))
      setStep(4)
      setPayment("idle")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Payment could not be completed.")
      setPayment("unavailable")
    }
  }
  if (loadingRoom)
    return (
      <main className="section page">
        <p role="status">Loading room...</p>
      </main>
    )
  if (!room)
    return (
      <main className="section page">
        <h1>Stay unavailable.</h1>
        <p
          className="error"
          role="alert"
        >
          {roomError || "This room could not be found."}
        </p>
        <Link to="/stay">Explore our rooms</Link>
      </main>
    )
  return (
    <main className="section page">
      <div className="eyebrow">YOUR ESCAPE, ONE STEP CLOSER</div>
      <h1>
        {step === 4
          ? booking?.status === "Confirmed"
            ? "Your stay is confirmed."
            : "Your stay is under review."
          : "Make room for something beautiful."}
      </h1>
      {error && (
        <p
          className="error"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="steps">
        {["Guest details", "Review stay", "Payment", "Confirmation"].map((s, i) => (
          <span
            className={step >= i + 1 ? "active" : ""}
            key={s}
          >
            {i + 1} <span>{s}</span>
          </span>
        ))}
      </div>
      <div className="checkout-layout">
        <div className="form-panel">
          {step === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setStep(2)
              }}
            >
              <h2>
                A little about <em>you.</em>
              </h2>
              <label>
                Full name
                <input
                  required
                  autoComplete="name"
                  value={guest.name}
                  onChange={(e) => setGuest({ ...guest, name: e.target.value })}
                />
              </label>
              <label>
                Email address
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={guest.email}
                  onChange={(e) => setGuest({ ...guest, email: e.target.value })}
                />
              </label>
              <label>
                Phone number
                <input
                  required
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91 98765 43210"
                  pattern="[+0-9 ()-]{10,18}"
                  value={guest.phone}
                  onChange={(e) => setGuest({ ...guest, phone: e.target.value })}
                />
              </label>
              <label>
                Special requests (optional)
                <textarea
                  value={guest.requests}
                  onChange={(e) => setGuest({ ...guest, requests: e.target.value })}
                />
              </label>
              <button className="button">
                Review your stay <ArrowRight size={17} />
              </button>
            </form>
          )}
          {step === 2 && (
            <>
              <h2>
                Every detail, <em>considered.</em>
              </h2>
              <h3>{guest.name}</h3>
              <p>
                {guest.email}
                <br />
                {guest.phone}
              </p>
              <p>{guest.requests}</p>
              <h3>Cancellation policy</h3>
              <p>
                Sample policy: free cancellation until 7 days before arrival; thereafter a one-night
                fee may apply.
              </p>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                I accept the <Link to="/policy/terms">booking terms</Link> and{" "}
                <Link to="/policy/cancellation">cancellation policy</Link>.
              </label>
              <div className="actions">
                <button
                  className="button secondary"
                  onClick={() => setStep(1)}
                >
                  Back
                </button>
                <button
                  className="button"
                  disabled={!accepted || busy || !liveRoom}
                  onClick={() => void reserve()}
                >
                  {busy ? "Saving reservation…" : "Continue to payment"} <ArrowRight size={17} />
                </button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <ShieldCheck size={35} />
              <h2>
                A secure start to <em>your stay.</em>
              </h2>
              <p>
                Your rooms are held for 15 minutes. Complete payment in Razorpay Checkout to confirm
                your reservation. Reference: {booking?.reference}
              </p>
              {payment === "processing" ? (
                <div
                  className="notice"
                  role="status"
                >
                  Preparing secure payment…
                </div>
              ) : (
                <button
                  className="button"
                  onClick={() => void pay()}
                >
                  {payment === "unavailable" ? "Retry payment connection" : "Continue to Razorpay"}
                </button>
              )}
              <div className="actions">
                <button
                  className="text-link"
                  disabled={payment === "processing"}
                  onClick={() => setStep(4)}
                >
                  View pending reservation →
                </button>
              </div>
            </>
          )}
          {step === 4 && (
            <>
              <CalendarDays size={38} />
              <h2>
                We’ve saved your <em>plans.</em>
              </h2>
              <p>
                {booking?.status === "Confirmed"
                  ? "Payment verified. Your reservation is confirmed."
                  : booking?.refundRequired
                    ? "Your payment requires staff review. Please contact the resort."
                    : "Your reservation is saved. Complete payment before the room hold expires to confirm your stay."}
              </p>
              <div className="notice">
                <strong>{booking?.reference}</strong>
                <br />
                {booking?.status} · Payment {booking?.payment}
              </div>
              <p>
                Arrival instructions will be provided after the resort confirms a real reservation.
              </p>
              <div className="actions">
                <Link
                  className="button"
                  to="/lookup"
                >
                  View booking details
                </Link>
                <Link
                  className="text-link"
                  to="/"
                >
                  Return home
                </Link>
              </div>
            </>
          )}
        </div>
        <aside>
          <Summary
            room={room}
            stay={stay}
            quote={booking || liveRoom?.quote}
          />
        </aside>
      </div>
    </main>
  )
}
