import { ArrowRight } from "lucide-react"
import { useState } from "react"
import type { Booking } from "../types/booking"
import { Summary } from "../components/booking/Summary"
import { useRooms } from "../lib/useRooms"
import { api, cancelBooking } from "../lib/api"

export function Lookup() {
  const [ref, setRef] = useState("")
  const [email, setEmail] = useState("")
  const [result, setResult] = useState<Booking | null>(null)
  const { rooms } = useRooms()
  const room = rooms.find(r => r.id === result?.room)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  return (
    <main className="section page narrow">
      <div className="eyebrow">YOUR PLANS, AT A GLANCE</div>
      <h1>
        Find your <em>reservation.</em>
      </h1>
      <p>Use your booking reference and the email address used for your reservation.</p>
      <form
        className="form-panel"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError("")
          try {
            const data = await api<{ booking: Booking }>("/bookings/lookup", {
              method: "POST",
              body: JSON.stringify({ reference: ref.trim().toUpperCase(), email: email.trim() }),
            })
            setResult(data.booking)
          } catch (error) {
            setResult(null)
            setError(error instanceof Error ? error.message : "Reservation lookup failed.")
          } finally {
            setBusy(false)
          }
        }}
      >
        <label>
          Booking reference
          <input
            required
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="VANA-0123456789ABCDEF"
          />
        </label>
        <label>
          Email address
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button
          className="button"
          disabled={busy}
        >
          {busy ? "Searching…" : "View reservation"} <ArrowRight size={17} />
        </button>
        {error && (
          <p
            className="error"
            role="alert"
          >
            {error}
          </p>
        )}
      </form>
      {result && (
        <div className="form-panel">
          <span className="badge">{result.status}</span>
          <h3>{result.reference}</h3>
          <p>
            {result.guest.name} · Payment: {result.payment}
          </p>
          {room ? <Summary
            room={room}
            stay={result.stay}
            quote={result}
          /> : <p>Property: {result.room}</p>}
          <button
            className="button secondary"
            disabled={busy || result.status === "Cancelled"}
            onClick={async () => {
              if (
                !confirm("Cancel this reservation? Any paid refund will require staff processing.")
              )
                return
              setBusy(true)
              setError("")
              try {
                setResult((await cancelBooking(result.reference)).booking)
              } catch (error) {
                setError(error instanceof Error ? error.message : "Cancellation failed.")
              } finally {
                setBusy(false)
              }
            }}
          >
            Cancel reservation
          </button>
          <p>
            Guest cancellation requires the browser used to create the booking, or the signed-in
            booking owner. Contact the resort if you need help.
          </p>
          {result.refundRequired && (
            <p className="notice">
              Refund requires staff processing. Cancellation does not automatically refund payment.
            </p>
          )}
        </div>
      )}
    </main>
  )
}
