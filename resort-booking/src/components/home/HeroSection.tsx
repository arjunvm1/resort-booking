import { ArrowUpRight, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { hero } from "../../data/resort"

export function HeroSection() {
  return (
<section
        className="hero"
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(8,29,23,.66),rgba(8,29,23,.08)),url(${hero})`,
        }}
      >
        <div className="hero-content">
          <div className="eyebrow light">— KUMARAKOM, KERALA</div>
          <h1>
            A little closer
            <br />
            to <em>nature.</em>
            <br />A little closer to you.
          </h1>
          <p>
            Hidden along the backwaters of Kerala, discover a slower
            <br className="desktop" /> kind of luxury. Just you, the water, and room to breathe.
          </p>
          <div className="hero-actions">
            <Link
              className="button cream"
              to="/stay"
            >
              Find your escape <ArrowUpRight size={18} />
            </Link>
            <a href="#about">
              Discover Vana <ArrowRight size={17} />
            </a>
          </div>
        </div>
        <div className="hero-caption">
          <strong>
            9.6 <small>/ 10</small>
          </strong>
          <div>
            A stay to remember<small>Illustrative guest rating</small>
          </div>
        </div>
        <div className="hero-bottom">
          ROOTED IN NATURE. CRAFTED FOR YOU.<span>SCROLL TO SLOW DOWN ↓</span>
        </div>
      </section>
  )
}
