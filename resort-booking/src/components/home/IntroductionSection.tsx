import { ArrowUpRight, Leaf } from "lucide-react"
import { photo } from "../../utils/format"

export function IntroductionSection() {
  return (
<section
        className="section intro"
        id="about"
      >
        <div className="intro-image">
          <img
            src={photo("photo-1540541338287-41700207dee6")}
            alt="Pool surrounded by tropical trees"
            loading="lazy"
          />
          <span>
            A WORLD AWAY.
            <br />
            RIGHT WHERE YOU BELONG.
          </span>
        </div>
        <div>
          <div className="eyebrow">WELCOME TO VANA</div>
          <h2>
            Some places invite you
            <br />
            to stay.
            <br />
            <em>Ours invites you to be.</em>
          </h2>
          <p>Wake to birdsong. Watch the backwaters drift by. Let the everyday gently fall away.</p>
          <p>
            At Vana, thoughtful spaces meet the warmth of Kerala hospitality. A quiet retreat for
            unhurried moments, meaningful connections, and the simple joy of doing a little less.
          </p>
          <a
            className="text-link"
            href="#experiences"
          >
            A glimpse of our world <ArrowUpRight size={18} />
          </a>
          <div className="signature">
            <Leaf
              size={25}
              strokeWidth={1}
            />
            <span>Naturally beautiful. Thoughtfully personal.</span>
          </div>
        </div>
      </section>
  )
}
