# Resort booking

The React frontend lives in `resort-booking/`; the Express backend lives separately in `api/`.
Use Node.js 22.13 or later.

## Setup

Dependencies have already been installed. For a fresh checkout:

```sh
npm --prefix api install
npm --prefix resort-booking install
```

Configure `api/.env` using `api/.env.example` as the template. Never put credentials
in `.env.example` or frontend files. `MONGODB_URI` must identify the intended
application database, for example `/resort_booking` before the URI query string. If no database name is supplied, the API uses `resort_booking`.
MongoDB Atlas or a local replica set is required for inventory transactions.
Use a random `JWT_SECRET` of at least 32 characters. An ignored local secret is
already generated if it was missing during setup.

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Seed the three room types once after configuring MongoDB. This adds five sample
rooms per type; existing room settings are preserved. Set actual inventory and
rates in the staff portal before accepting real reservations.

```sh
npm --prefix api run seed
```

For staff access, set `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `api/.env`,
then run `npm --prefix api run seed:admin`. Remove `ADMIN_PASSWORD` after setup.
The command creates a new staff account and refuses to overwrite existing users.
Public registration always creates guest accounts.

Run these commands from the workspace root in two terminals:

```sh
npm run dev:api
npm run dev:frontend
```

The API defaults to `http://127.0.0.1:5000`. Vite forwards `/api` requests there.
If you change the port, update `resort-booking/vite.config.ts` as well.
`CLIENT_URL` is a comma-separated list of exact allowed frontend origins without
trailing slashes. Use the same hostname for the frontend and API when testing
cookie authentication directly; Vite's proxy handles this for normal development.

## Reservations and payments

### Room photo uploads with Supabase

Use **Admin / Add room** (`/admin/rooms/new`) to create a room. Select up to six photos, click **Upload photos**, then save.
The home page is at `/`; existing room management is at `/admin/rooms`. The browser calls Supabase
`upload()` followed by `getPublicUrl()` and saves the returned URLs in `imageUrls`, using the first as the `image` cover.
JPEG, PNG and WebP files up to 5 MB are supported, with a local preview.

1. Uploads use your existing public `listing-images` bucket and `listings/` folder.
   The SDK sends POST `/storage/v1/object/listing-images/listings/<timestamp>-<random>.<extension>`.
   For a fresh Supabase project only, run `api/supabase/storage.sql` to create the
   bucket and upload policy.
2. Configure `resort-booking/.env`. The supplied URL and publishable key are already
   configured locally. For a fresh checkout, copy `.env.example` and fill in:

   ```dotenv
   VITE_SUPABASE_URL=https://ombgugyzrniyrdffksgl.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-key
   ```

3. Restart Vite, sign in as an admin, select a photo, and save the room.

The client and upload helper are in `resort-booking/src/supabase.ts`.
This browser upload flow does not require `SUPABASE_SECRET_KEY`. Never put secret
or service_role keys in Vite variables.
The included policy allows anonymous INSERT only under `listing-images/listings/`, with
no overwrite, delete or list permissions. Anyone holding the publishable key can
upload under this policy: the Express admin session protects room creation but
is not recognized by Supabase. For admin-only storage access, integrate Supabase
Auth and an admin policy, or use the optional server upload endpoint.
Uploaded photos remain in the form if room saving fails. If a batch upload partially fails, successful photos remain and only failed files are retried.
The room detail page displays the saved photos in a gallery with previous/next controls, keyboard arrows, thumbnails and swipe navigation.
Existing rooms with only an `image` field display that photo.
Old photos are preserved on replacement; remove unused images in the Supabase dashboard.

Availability and totals are calculated on the server. All monetary response
fields except `nightlyRate` and room `price` are integer paise. `TAX_PERCENT` is a
configurable sample value and must be set to the resort's actual tax policy.

Creating a reservation holds inventory for 15 minutes. Expired unpaid holds stop
counting toward availability without deleting the reservation or its payment
history. A room write inside each inventory transaction serializes concurrent
allocations. Confirmed bookings continue to occupy their dates.

Guest checkout returns a private `bookingToken`; the frontend keeps it in
sessionStorage and sends it in `X-Booking-Token`. Booking reference and email
allow lookup, but do not authorize payment or cancellation. Those operations
require the booking token, signed-in booking owner, or staff authorization.
Guests using another browser can contact staff for cancellation help.

Set Razorpay test keys in `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Enable automatic
payment capture in Razorpay. Configure a `payment.captured` webhook pointing to
your publicly reachable `/api/payments/webhook`, with its separate secret in
`RAZORPAY_WEBHOOK_SECRET`. Localhost requires a tunnel for webhook delivery.

Checkout uses a server-created order and verifies the signature, then fetches the
payment to verify its captured status, order, currency and amount. A signed raw-body
webhook also reconciles captured payments. Repeated payment verification is
idempotent. A late payment that cannot obtain inventory is marked `Payment review`
with `refundRequired`; it does not displace another reservation.

Cancelling a paid booking flags it for staff refund processing. Automatic refunds,
refund-completion tracking, resort-specific cancellation penalties, account email
verification, password reset and outbound confirmation emails are not implemented.
The staff portal shows overview statistics, rooms and paginated reservations.
Marketing pages and policies still contain sample resort content.

## API routes

| Method | Route | Access / purpose |
| --- | --- | --- |
| GET | `/api/health` | Process health |
| GET | `/api/ready` | Database readiness |
| POST | `/api/auth/register` | Guest registration: name, email, password |
| POST | `/api/auth/login` | Sign in: email, password |
| POST | `/api/auth/logout` | Clear browser session |
| GET | `/api/auth/me` | Current authenticated account |
| GET | `/api/rooms` | Active room catalog |
| GET | `/api/rooms/:id` | Room details |
| GET | `/api/rooms/availability` | Query: checkin, checkout, adults, children, quantity |
| POST | `/api/bookings` | Body: room, stay, guest; optional signed-in owner |
| POST | `/api/bookings/lookup` | Body: reference, email; rate limited |
| GET | `/api/bookings/mine` | Signed-in owner's paginated bookings |
| GET | `/api/bookings/:reference` | Booking token, owner or staff |
| POST | `/api/bookings/:reference/cancel` | Booking token, owner or staff |
| POST | `/api/payments/:reference/order` | Booking token, owner or staff |
| POST | `/api/payments/:reference/verify` | Booking authorization + Razorpay checkout result |
| POST | `/api/payments/webhook` | Raw JSON + X-Razorpay-Signature |
| GET | `/api/admin/overview` | Staff statistics |
| GET | `/api/admin/bookings` | Staff; page, limit, optional status |
| POST | `/api/admin/bookings/:reference/cancel` | Staff cancellation |
| GET | `/api/admin/rooms` | Staff room catalog |
| POST | `/api/admin/rooms/image` | Staff photo upload; raw JPEG, PNG or WebP body, max 5 MB |
| POST | `/api/admin/rooms` | Staff room creation |
| PATCH | `/api/admin/rooms/:id` | Staff room updates |

`stay` contains `checkin`, `checkout` (YYYY-MM-DD), `adults`, `children` and `quantity`.
`guest` contains `name`, `email`, `phone` and optional `requests`.
Reservations reject client-supplied totals, payment status and unknown fields.
Staff cannot reduce inventory while future confirmed reservations or active holds
exist. Deactivating a room stops new bookings but preserves existing reservations.

## Verification

```sh
npm run check:api
npm --prefix api test
npm run build
```

Core tests cover validation, pricing, nightly inventory, signatures, CORS,
authentication gates and HTTP responses without requiring a database.
For a transaction and booking lifecycle integration test, configure a reachable
MongoDB replica set and run in PowerShell:

```powershell
$env:RUN_DB_TESTS = '1'
npm --prefix api test
Remove-Item Env:RUN_DB_TESTS
```

This test uses a uniquely named `resort_booking_test_*` database on the configured
cluster and removes only that temporary database afterward. It does not use the
application database. No real payment is sent; captured payment fixtures test the
reservation state transitions. Live Razorpay checkout still needs configured test
keys and manual testing.

For deployment, use HTTPS and a reverse proxy serving `resort-booking/dist` and
forwarding `/api` to the separate backend. Set `NODE_ENV=production`, `CLIENT_URL`
and `TRUST_PROXY` to match that deployment. Session cookies are HTTP-only, strict
SameSite and secure in production. JWT sessions expire after one day; logout clears
the browser cookie but does not revoke a copied token. Rate limits use an in-process
store, so shared limits need an external store when running multiple instances.

The repository-root `netlify.toml` builds the frontend from `resort-booking`, serves React routes through `index.html`,
and proxies `/api/*` to `https://resort-booking-49y5.onrender.com`. When deploying
the frontend to Netlify. The build command and publish directory are already configured
in that file. Set Render's `CLIENT_URL`
to the exact Netlify site origin without a trailing slash.
The same routing rules are included in `resort-booking/public/_redirects`, which
Vite copies into `dist` so Netlify can apply them from the deployed artifact.
