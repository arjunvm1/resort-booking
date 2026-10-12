import { Leaf } from "lucide-react"
import { Link } from "react-router-dom"

export function Brand() {
  return (
    <Link
      className="brand"
      to="/"
    >
      <Leaf
        size={34}
        strokeWidth={1.2}
      />
      <span>
        vana<small>A BACKWATER RETREAT</small>
      </span>
    </Link>
  )
}
