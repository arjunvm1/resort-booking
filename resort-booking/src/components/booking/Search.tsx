import { ArrowRight } from "lucide-react"
import { useState } from "react"
import type { Stay } from "../../types/booking"

export function Search({
  stay,
  setStay,
  onSearch,
}: {
  stay: Stay
  setStay: (s: Stay) => void
  onSearch: () => void
}) {
  const [error, setError] = useState("")
  const update = (key: keyof Stay, v: string) =>
    setStay({ ...stay, [key]: key === "checkin" || key === "checkout" ? v : Number(v) })
  return (
    <form
      className="search"
      onSubmit={(e) => {
        e.preventDefault()
        if (stay.checkout <= stay.checkin) {
          setError("Check-out must be after check-in.")
          return
        }
        setError("")
        onSearch()
      }}
    >
      <label>
        <span>CHECK-IN</span>
        <input
          aria-label="Check-in date"
          type="date"
          min={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}
          value={stay.checkin}
          required
          onChange={(e) => update("checkin", e.target.value)}
        />
      </label>
      <label>
        <span>CHECK-OUT</span>
        <input
          aria-label="Check-out date"
          type="date"
          min={stay.checkin}
          value={stay.checkout}
          required
          onChange={(e) => update("checkout", e.target.value)}
        />
      </label>
      <label>
        <span>GUESTS</span>
        <select
          aria-label="Adults"
          value={stay.adults}
          onChange={(e) => update("adults", e.target.value)}
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option
              key={n}
              value={n}
            >
              {n} adults
            </option>
          ))}
        </select>
      </label>
      <label className="compact">
        <span>CHILDREN</span>
        <select
          value={stay.children}
          onChange={(e) => update("children", e.target.value)}
        >
          {[0, 1, 2, 3].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <button className="button">
        Check availability <ArrowRight size={17} />
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
  )
}
