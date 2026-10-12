import { Users, BedDouble } from "lucide-react"
import { useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import type { Stay } from "../types/booking"
import { useRooms } from "../lib/useRooms"
import { Summary } from "../components/booking/Summary"
import { Search } from "../components/booking/Search"
import { RoomGallery } from "../components/rooms/RoomGallery"

export function Detail({ stay, setStay }: { stay: Stay; setStay: (s: Stay) => void }) {
  const { id } = useParams()
  const { rooms, loading, error: loadError } = useRooms(id)
  const room = rooms.find((r) => r.id === id)
  const go = useNavigate()
  const [error, setError] = useState("")
  if (loading) return <main className="section page"><p role="status">Loading room...</p></main>
  if (!room)
    return (
      <main className="section page">
        <h1>Stay not found.</h1>
        {loadError && <p className="error" role="alert">{loadError}</p>}
        <Link to="/stay">Explore our rooms</Link>
      </main>
    )
  return (
    <main className="section page">
      <Link
        className="text-link"
        to="/stay"
      >
        ← All stays
      </Link>
      <div className="eyebrow">{room.category}</div>
      <h1>{room.name}</h1>
      <div className="detail-layout">
        <div>
          <RoomGallery key={room.id} name={room.name} imageUrls={room.imageUrls?.length ? room.imageUrls : [room.image]} />
          <h2>
            Room to <em>just be.</em>
          </h2>
          <p>
            {room.description} Natural textures, soft linens, and considered comforts make every
            moment feel effortless.
          </p>
          <div className="room-meta">
            <span>
              <Users /> {room.guests} guests
            </span>
            <span>
              <BedDouble /> King bed
            </span>
            <span>{room.size} m²</span>
          </div>
          <h3>The little comforts</h3>
          <div className="detail-amenities">
            {[
              "Complimentary Wi-Fi",
              "Air conditioning",
              "Breakfast included",
              "Room service",
              "Private outdoor space",
              room.pool ? "Private swimming pool" : "Garden or lake views",
            ].map((a) => (
              <span key={a}>✓ {a}</span>
            ))}
          </div>
          <h3>A few things to know</h3>
          <p>
            Check-in from 2:00 PM · Check-out by 11:00 AM. No smoking indoors. Quiet hours from
            10:00 PM.
          </p>
          <h3>Flexible plans</h3>
          <p>
            Illustrative policy: cancel free up to 7 days before arrival. Later cancellations may
            incur one night’s charge. Final terms are provided before payment.
          </p>
        </div>
        <aside className="booking-panel">
          <Summary
            room={room}
            stay={stay}
          />
          <Search
            stay={stay}
            setStay={setStay}
            onSearch={() => {
              if (stay.adults + stay.children > room.guests * stay.quantity) {
                setError("Increase the room quantity for this guest count.")
                return
              }
              go(`/booking/${room.id}`)
            }}
          />
          {error && <p className="error">{error}</p>}
          <p className="sample-note">Check your dates to continue to guest details.</p>
        </aside>
      </div>
    </main>
  )
}
