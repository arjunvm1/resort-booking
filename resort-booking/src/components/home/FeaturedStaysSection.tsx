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
                A space for every <em>escape.</em>
              </h2>
            </div>
            <Link
              className="text-link"
              to="/stay"
            >
              Explore all stays <ArrowUpRight size={18} />
            </Link>
          </div>
          <p className="section-desc">
            Intimate rooms, peaceful suites, and private villas. Find your own corner of calm.
          </p>
          {loading && <p role="status">Loading rooms...</p>}
          {error && <p className="error" role="alert">{error}</p>}
          {!loading && !error && !rooms.length && <p>New stays are coming soon.</p>}
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
