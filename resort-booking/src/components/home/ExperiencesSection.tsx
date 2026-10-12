import { ArrowUpRight } from "lucide-react"
import { photo } from "../../utils/format"

export function ExperiencesSection() {
  return (
<section
        className="section experiences"
        id="experiences"
      >
        <div className="section-heading">
          <div>
            <div className="eyebrow">MORE THAN A STAY</div>
            <h2>
              Follow your <em>own rhythm.</em>
            </h2>
          </div>
          <p>
            Make room for the moments
            <br />
            that make you feel alive.
          </p>
        </div>
        <div className="experience-grid">
          {[
            {
              title: "The backwaters, unhurried",
              sub: "Drift into a different pace of life",
              img: "photo-1500375592092-40eb2168fd21",
            },
            {
              title: "A taste of Kerala",
              sub: "Local flavours. A little love in every plate.",
              img: "photo-1414235077428-338989a2e8c0",
            },
            {
              title: "Come back to yourself",
              sub: "Wellness, rooted in tradition",
              img: "photo-1540555700478-4be289fbecef",
            },
          ].map((i) => (
            <a
              href="#contact"
              className="experience"
              key={i.title}
            >
              <img
                src={photo(i.img, 900)}
                alt={i.title}
                loading="lazy"
              />
              <div>
                <h3>{i.title}</h3>
                <p>{i.sub}</p>
              </div>
              <ArrowUpRight />
            </a>
          ))}
        </div>
      </section>
  )
}
