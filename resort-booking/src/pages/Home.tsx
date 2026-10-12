import { ShieldCheck, X } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import type { Stay } from "../types/booking"
import { HeroSection } from "../components/home/HeroSection"
import { Search } from "../components/booking/Search"
import { IntroductionSection } from "../components/home/IntroductionSection"
import { FeaturedStaysSection } from "../components/home/FeaturedStaysSection"
import { ExperiencesSection } from "../components/home/ExperiencesSection"
import { AmenitiesSection } from "../components/home/AmenitiesSection"
import { GallerySection } from "../components/home/GallerySection"
import { TestimonialSection } from "../components/home/TestimonialSection"
import { ContactSection } from "../components/home/ContactSection"

export function Home({ stay, setStay }: { stay: Stay; setStay: (s: Stay) => void }) {
  const go = useNavigate()
  const [lightbox, setLightbox] = useState("")
  return (
    <>
      <HeroSection />
      <div className="search-wrap">
        <Search
          stay={stay}
          setStay={setStay}
          onSearch={() => go("/stay")}
        />
        <p className="search-note">
          <ShieldCheck size={13} /> Your escape, thoughtfully taken care of.{" "}
          <span>Sample rates · No payment required to explore</span>
        </p>
      </div>
      <IntroductionSection />
      <FeaturedStaysSection />
      <ExperiencesSection />
      <AmenitiesSection />
      <GallerySection onEnlarge={setLightbox} />
      <TestimonialSection />
      <ContactSection />
      {lightbox && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged photograph"
          onClick={() => setLightbox("")}
        >
          <button
            aria-label="Close photograph"
            onClick={() => setLightbox("")}
          >
            <X />
          </button>
          <img
            src={lightbox}
            alt="Enlarged resort view"
          />
        </div>
      )}
    </>
  )
}
