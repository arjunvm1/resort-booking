import { Waves, Coffee, Wifi, Car, Wind, Sparkles } from "lucide-react"

export function AmenitiesSection() {
  return (
<section className="amenities">
        <div className="eyebrow">ALL THE LITTLE COMFORTS</div>
        <h2>
          Everything you need. <em>Nothing you don't.</em>
        </h2>
        <div className="amenity-grid">
          {[
            { Icon: Waves, label: "Swimming pool" },
            { Icon: Coffee, label: "Local dining" },
            { Icon: Wifi, label: "Complimentary Wi-Fi" },
            { Icon: Car, label: "Free parking" },
            { Icon: Wind, label: "Air conditioning" },
            { Icon: Sparkles, label: "Spa & wellness" },
          ].map(({ Icon, label }) => (
            <div key={label}>
              <Icon
                size={26}
                strokeWidth={1.3}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>
  )
}
