import { ArrowUpRight, Users, BedDouble } from "lucide-react"
import { Link } from "react-router-dom"
import type { ApiRoom } from "../../lib/api"
import { money } from "../../utils/format"

export function RoomCard({ room }: { room: ApiRoom }) {
  return (
    <article className="room-card">
      <Link
        className="room-photo"
        to={`/stay/${room.id}`}
      >
        <img
          src={room.image}
          alt={room.name}
          loading="lazy"
        />
        <span>{room.category}</span>
        <div>
          <ArrowUpRight size={20} />
        </div>
      </Link>
      <div className="room-body">
        <h3>
          <Link to={`/stay/${room.id}`}>{room.name}</Link>
        </h3>
        <p>{room.description}</p>
        <div className="room-meta">
          <span>
            <Users size={15} /> Up to {room.guests} guests
          </span>
          <span>
            <BedDouble size={16} /> King bed
          </span>
        </div>
        <div className="room-bottom">
          <span>
            <strong>{money(room.price)}</strong> <small>/ night</small>
          </span>
          <Link to={`/stay/${room.id}`}>
            View stay <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
    </article>
  )
}
