import { ArrowUpRight, MapPin } from "lucide-react"
import { Link } from "react-router-dom"

export function ContactSection() {
  return (
<section
        className="section contact"
        id="contact"
      >
        <div>
          <div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div>
          <h2>
            Somewhere beautiful.
            <br />
            <em>Somewhere you belong.</em>
          </h2>
          <p>On the quiet shores of Vembanad Lake, Kumarakom, Kerala.</p>
          <p>Address and resort contact details to be added.</p>
          <Link
            className="button"
            to="/stay"
          >
            Plan your stay <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="map">
          <MapPin
            size={35}
            strokeWidth={1.3}
          />
          <h3>Kumarakom, Kerala</h3>
          <p>Vembanad Lake · India</p>
          <span>LOCATION PREVIEW</span>
        </div>
      </section>
  )
}
