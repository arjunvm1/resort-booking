import { ArrowUpRight, X, Menu } from "lucide-react"
import { Link } from "react-router-dom"
import { useState } from "react"
import { Brand } from "./Brand"

export function Header() {
  const [open, setOpen] = useState(false)
  return (
    <header>
      <Brand />
      <nav
        className={open ? "open" : ""}
        onClick={() => setOpen(false)}
      >
        <Link to="/">Home</Link>
        <Link to="/stay">Stay</Link>
        <a href="/#experiences">Experiences</a>
        <a href="/#gallery">Gallery</a>
        <a href="/#about">Our Story</a>
        <a href="/#contact">Contact</a>
      </nav>
      <Link
        className="button nav-book"
        to="/stay"
      >
        Book your stay <ArrowUpRight size={16} />
      </Link>
      <button
        className="menu"
        aria-label="Toggle menu"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
    </header>
  )
}
