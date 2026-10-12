import { Leaf } from "lucide-react"
import { useState } from "react"
import type { Stay } from "../types/booking"
import { useRooms } from "../lib/useRooms"
import { Search } from "../components/booking/Search"
import { date } from "../utils/format"
import { RoomCard } from "../components/rooms/RoomCard"
import { availability } from "../lib/api"
import type { ApiRoom } from "../lib/api"

export function Listing({ stay, setStay }: { stay: Stay; setStay: (s: Stay) => void }) {
  const { rooms, loading: loadingRooms, error: roomsError } = useRooms()
  const [filter, setFilter] = useState("all")
  const [sort, setSort] = useState("popular")
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [availableRooms, setAvailableRooms] = useState<ApiRoom[]>([])
  const [error, setError] = useState("")
  const visible = (searched ? availableRooms : rooms)
    .filter(
      (r) =>
        (filter !== "pool" || r.pool) && r.guests >= stay.adults + stay.children,
    )
    .sort((a, b) => (sort === "high" ? b.price - a.price : a.price - b.price))
  return (
    <main className="section page">
      <div className="eyebrow">MAKE YOURSELF AT HOME</div>
      <h1>
        Your own corner of <em>calm.</em>
      </h1>
      <p>Thoughtful spaces for slow mornings and beautiful days.</p>
      <Search
        stay={stay}
        setStay={setStay}
        onSearch={async () => {
          if (loading) return
          setLoading(true)
          setError("")
          try {
            const result = await availability(stay)
            setAvailableRooms(result.rooms)
            setSearched(true)
          } catch (error) {
            setError(error instanceof Error ? error.message : "Availability could not be checked.")
            setAvailableRooms([])
            setSearched(true)
          } finally {
            setLoading(false)
          }
        }}
      />
      <div className="filters">
        <span>
          {searched
            ? `Availability · ${date(stay.checkin)} – ${date(stay.checkout)}`
            : "Explore our stays"}
        </span>
        <select
          aria-label="Property filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">Entire property</option>
          <option value="pool">Private pool</option>
        </select>
        <select
          aria-label="Sort properties"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="popular">Recommended</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
        </select>
      </div>
      {(error || roomsError) && (
        <p
          className="error"
          role="alert"
        >
          {error || roomsError}
        </p>
      )}
      {loading || loadingRooms ? (
        <div className="room-grid">
          {[1, 2, 3].map((r) => (
            <div
              className="skeleton"
              key={r}
            />
          ))}
        </div>
      ) : (error || roomsError) ? null : visible.length ? (
        <div className="room-grid">
          {visible.map((r) => (
            <RoomCard
              key={r.id}
              room={r}
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          <Leaf />
          <h3>The property cannot host this guest count.</h3>
          <p>Adjust the number of guests to check availability.</p>
          <button
            className="button"
            onClick={() => setStay({ ...stay, adults: 2, children: 0, quantity: 1 })}
          >
            Reset guest count
          </button>
        </div>
      )}
      <p className="sample-note">
        Availability is checked when you search and again when you reserve.
      </p>
    </main>
  )
}
