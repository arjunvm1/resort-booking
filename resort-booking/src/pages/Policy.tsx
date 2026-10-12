import { useParams } from "react-router-dom"

export function Policy() {
  const { type } = useParams()
  return (
    <main className="section page narrow">
      <div className="eyebrow">GOOD TO KNOW</div>
      <h1>
        {type === "privacy"
          ? "Privacy policy"
          : type === "terms"
            ? "Booking terms"
            : "Cancellation policy"}
      </h1>
      <p>
        Illustrative policy content. The resort must provide its approved policies before accepting
        reservations.
      </p>
      <div className="form-panel">
        {type === "privacy" ? (
          <p>
            Demo guest details are stored in this browser session to display your pending
            reservation. Do not enter sensitive personal data into this prototype.
          </p>
        ) : (
          <p>
            All rates, taxes, availability, and reservations are sample data. No room is reserved
            until the resort confirms availability and verifies payment. Sample cancellation terms
            allow free cancellation up to seven days before arrival, with a one-night fee
            thereafter.
          </p>
        )}
      </div>
    </main>
  )
}
