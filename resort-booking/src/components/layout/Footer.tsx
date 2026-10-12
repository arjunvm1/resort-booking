import { ArrowUpRight } from "lucide-react"
import { Link } from "react-router-dom"
import { Brand } from "./Brand"

export function Footer() {
  return (
    <footer>
      <div className="footer-main">
        <div>
          <Brand />
          <p>
            A slower kind of luxury.
            <br />
            Kumarakom, Kerala, India.
          </p>
        </div>
        <div>
          <span>EXPLORE</span>
          <Link to="/stay">Our stays</Link>
          <a href="/#experiences">Experiences</a>
          <a href="/#about">Our story</a>
        </div>
        <div>
          <span>YOUR STAY</span>
          <Link to="/lookup">Find your booking</Link>
          <Link to="/policy/cancellation">Cancellation policy</Link>
          <a href="/#contact">Plan your visit</a>
        </div>
        <div className="footer-message">
          Leave the rush behind.
          <br />
          <em>Find your Vana.</em>
          <Link to="/stay">
            Your escape awaits <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Vana Retreat. Concept website.</span>
        <div>
          <Link to="/policy/privacy">Privacy</Link>
          <Link to="/policy/terms">Terms</Link>
          <Link to="/admin">Staff portal</Link>
        </div>
        <span>MADE FOR SLOWER DAYS</span>
      </div>
    </footer>
  )
}
