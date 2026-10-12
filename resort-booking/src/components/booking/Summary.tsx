import type { ApiRoom } from "../../lib/api"
import type { Stay } from "../../types/booking"
import { date } from "../../utils/format"
import { money } from "../../utils/format"
import type { Quote } from "../../lib/api"

export function Summary({ room, stay, quote }: { room: ApiRoom; stay: Stay; quote?: Quote }) {
  const nights = Math.max(
    1,
    Math.round((Date.parse(stay.checkout) - Date.parse(stay.checkin)) / 86400000),
  )
  const subtotal = nights * room.price
  return (
    <div className="summary">
      <img
        src={room.image}
        alt={room.name}
      />
      <h3>{room.name}</h3>
      <p>
        {date(stay.checkin)} — {date(stay.checkout)}
      </p>
      <p>
        {nights} nights · {stay.adults} adults · {stay.children} children · Entire property
      </p>
      <hr />
      <div>
        <span>
          {money(quote?.nightlyRate ?? room.price)} × {nights} nights
        </span>
        <span>{money(quote ? quote.subtotal / 100 : subtotal)}</span>
      </div>
      <div>
        <span>{quote ? 'Tax' : 'Estimated tax (12%)'}</span>
        <span>{money(quote ? quote.tax / 100 : subtotal * 0.12)}</span>
      </div>
      <div className="total">
        <span>Total</span>
        <strong>{money(quote ? quote.amount / 100 : subtotal * 1.12)}</strong>
      </div>
      <small>{quote ? 'Rates calculated by the resort.' : 'Estimated pricing. Final rates are calculated when you reserve.'}</small>
    </div>
  )
}
