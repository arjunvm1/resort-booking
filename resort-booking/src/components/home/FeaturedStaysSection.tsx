import { ArrowUpRight } from "lucide-react"
import { Link } from "react-router-dom"
import { useRooms } from "../../lib/useRooms"
import { RoomCard } from "../rooms/RoomCard"

export function FeaturedStaysSection() {
  const { rooms, loading, error } = useRooms()
  return (
<section className="stays">
        <div className="section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">REST, YOUR WAY</div>
              <h2>
                Your private <em>escape.</em>
              </h2>
            </div>
            <Link
              className="text-link"
              to="/stay"
            >
              View the property <ArrowUpRight size={18} />
            </Link>
          </div>
          <p className="section-desc">
            The entire retreat is yours, with private spaces for your group to slow down together.
          </p>
          {loading && <p role="status">Loading property...</p>}
          {error && <p className="error" role="alert">{error}</p>}
          {!loading && !error && !rooms.length && <p>Property details are coming soon.</p>}
          <div className="room-grid">
            {rooms.map((r) => (
              <RoomCard
                key={r.id}
                room={r}
              />
            ))}
          </div>
          <p className="sample-note">
            Indicative design prices · Final rates and availability are confirmed by the resort.
          </p>
        </div>
      </section>
  )
}
