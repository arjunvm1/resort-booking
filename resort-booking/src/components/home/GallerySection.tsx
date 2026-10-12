import { hero } from "../../data/resort"
import { rooms } from "../../data/resort"
import { photo } from "../../utils/format"

export function GallerySection({ onEnlarge }: { onEnlarge: (src: string) => void }) {
  return (
<section
        className="section gallery"
        id="gallery"
      >
        <div className="section-heading">
          <div>
            <div className="eyebrow">POSTCARDS FROM VANA</div>
            <h2>
              Take a little <em>look around.</em>
            </h2>
          </div>
          <span>Click a moment to explore ↗</span>
        </div>
        <div className="gallery-grid">
          {[hero, rooms[0].image, photo("photo-1540541338287-41700207dee6"), rooms[2].image].map(
            (src, i) => (
              <button
                key={src}
                onClick={() => onEnlarge(src)}
                aria-label={`Enlarge resort photograph ${i + 1}`}
              >
                <img
                  src={src}
                  alt={["Resort at dusk", "Peaceful bedroom", "Poolside palms", "Private pool"][i]}
                  loading="lazy"
                />
              </button>
            ),
          )}
        </div>
      </section>
  )
}
