import { BrowserRouter, Routes, Route, Link } from "react-router-dom"
import { useState } from "react"
import { initial } from "./data/resort"
import { Header } from "./components/layout/Header"
import { Home } from "./pages/Home"
import { Listing } from "./pages/Listing"
import { Detail } from "./pages/Detail"
import { Checkout } from "./pages/Checkout"
import { Lookup } from "./pages/Lookup"
import { Admin } from "./pages/Admin"
import { Policy } from "./pages/Policy"
import { Footer } from "./components/layout/Footer"
import "./App.css"

export function App() {
  const [stay, setStay] = useState(initial)
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route
          path="/"
          element={
            <Home
              stay={stay}
              setStay={setStay}
            />
          }
        />
        <Route
          path="/stay"
          element={
            <Listing
              stay={stay}
              setStay={setStay}
            />
          }
        />
        <Route
          path="/stay/:id"
          element={
            <Detail
              stay={stay}
              setStay={setStay}
            />
          }
        />
        <Route
          path="/booking/:id"
          element={<Checkout stay={stay} />}
        />
        <Route
          path="/lookup"
          element={<Lookup />}
        />
        <Route
          path="/admin"
          element={<Admin />}
        />
        <Route path="/admin/rooms" element={<Admin section="Property" />} />
        <Route path="/admin/rooms/new" element={<Admin section="Add property" />} />
        <Route path="/admin/rooms/:id/edit" element={<Admin section="Edit property" />} />
        <Route path="/admin/bookings" element={<Admin section="Bookings" />} />
        <Route
          path="/policy/:type"
          element={<Policy />}
        />
        <Route
          path="*"
          element={
            <main className="section page">
              <h1>A little off the beaten path.</h1>
              <Link
                className="button"
                to="/"
              >
                Return home
              </Link>
            </main>
          }
        />
      </Routes>
      <Footer />
    </BrowserRouter>
  )
}

export default App
