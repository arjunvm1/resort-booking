# Vana frontend

React, TypeScript and Vite frontend for the sibling Express API in `../api`.
See [workspace setup and API documentation](../README.md).

Run `npm run dev` here, or `npm run dev:frontend` from the workspace root.
Start the API separately with `npm run dev:api` from the root.

`/stay` checks live availability; `/booking/:id` creates reservations and opens
Razorpay Checkout; `/lookup` reads reservations from MongoDB; `/admin` requires a
staff account and exposes overview, room settings and reservation management.
Vite proxies `/api` to port 5000. A production reverse proxy must provide the same
routing.

Home and room-detail marketing content still use the static resort catalog.
Images, testimonials, contact details and policies remain sample content.
Booking totals and inventory are validated by the backend.
