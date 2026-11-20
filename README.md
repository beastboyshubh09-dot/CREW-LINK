# CrewLink

CrewLink connects people who need short, local lifting and moving jobs with nearby verified workers.

## Run the frontend

```bash
npm install
cp .env.example .env
npm run dev
```

The app starts in mock mode (`VITE_USE_MOCK=true`) and is demoable without a backend. Use the role selector at registration, or sign in with any email and password to enter the requester demo. Demo roles can also be selected from the sign-in screen.

## Connect to Django

Set `VITE_USE_MOCK=false`, `VITE_API_BASE_URL` to the Django REST API root, and `VITE_WS_URL` to the Django Channels WebSocket root (the client appends `/events/`). The API client sends `Authorization: Bearer <access>` and attempts `POST /auth/token/refresh/` with `{ refresh }` after a 401. Resource modules use `/auth/login/`, `/auth/register/`, `/jobs/`, `/workers/`, `/payments/`, and `/admin/*`; payment order/verification use `/payments/orders/` and `/payments/verify/`. Adjust these paths and payload field names to your backend contract before connecting. No backend routes or serializers were present in this repository, so these integration paths are explicit defaults, not verified Django endpoint names.

The WebSocket client expects JSON messages with `type` values `job.status`, `job.request`, or `crew.assigned`; the corresponding `job_id`, `status`, and optional `job.type` fields are used for notifications. The frontend refreshes an expired session by dispatching `POST /auth/token/refresh/` with `{ refresh }` and expects `{ access }` in response. Align these event and token field names with Django Channels/SimpleJWT if they differ.

## Open-source location and worker matching

The customer booking flow uses browser geolocation (only after the user presses **Detect my location**), clickable Leaflet pins, and Nominatim search/reverse geocoding for Indian addresses and PIN codes. Search is explicit (not autocomplete), and Nominatim requests from a browser tab are spaced by at least 1.1 seconds. Workers separately opt in to location sharing; the browser publishes their latest position only while they are available, at most once every 30 seconds. Turning availability off stops sharing. Customer matching is skill-, availability-, freshness-, and radius-aware; displayed proximity is a Haversine straight-line distance. Selecting a worker draws an OSRM road route with road distance and duration; a straight-line fallback is labeled approximate.

Set `VITE_MAP_TILE_URL`, `VITE_NOMINATIM_URL`, and `VITE_OSRM_URL` in `.env` to use compatible self-hosted or replacement services. Defaults point to public OSM/OSRM community services and are suitable only for light development/testing, not unlimited production traffic. Keep OSM attribution visible and follow the tile provider's caching/usage policy. Nominatim's public service is not an autocomplete API and has strict usage limits; use a suitable hosted provider or self-host it for production volume. OSRM's public demo likewise has no production availability guarantee.

### Django location API contract

This repository contains no backend implementation, migrations, or database schema. With `VITE_USE_MOCK=false`, the frontend expects the Django backend to implement the following authenticated and authorized behavior before enabling production matching:

- `GET /workers/nearby/?lat=...&lng=...&radius_km=...&skills=...` returns only fresh, available, consented, skill-matching workers in radius, with the fields the customer needs (`id`, `name`, `rating`, `jobs`, `skills`, `profile_picture` when available, `availability_status`, `location: { lat, lng }`, `last_location_update`, `distance_km`). Authorize this for the active job/customer context and do not expose worker coordinates via public profiles or admin-free endpoints.
- `PATCH /workers/me/location-sharing/` accepts `{ enabled, location }` to record explicit consent and the initial fix; disabling consent must clear stored coordinates and make the worker unavailable.
- `PATCH /workers/me/availability/` accepts `{ online, location }`; going offline must stop sharing and remove or invalidate the latest position.
- `PUT /workers/me/location/` accepts `{ lat, lng, updated_at }`, is owner-authenticated, and must reject updates unless the worker has consented and is available. Store only the latest position, not a location history.
- `GET /workers/me/dashboard/` includes the authenticated worker's `online`, `locationSharingEnabled`, and own latest `location` state; `GET /workers/me/active-job/` returns only an assignment for that worker with its authorized job destination and current worker position. The active-job page polls for changes every 30 seconds.
- `POST /jobs/` accepts the existing job fields plus `job_latitude`, `job_longitude`, `job_address`, `pincode`, `city`, `state`, `search_radius_km`, and `worker_ids`. Re-check all worker eligibility, consent, freshness, distance, and job authorization on the server; never trust client-supplied distances or worker IDs.

The frontend intentionally cannot enforce those security and persistence guarantees without the absent backend. Mock mode uses clearly labeled sample worker records; it does not simulate multiple live workers or persist data across reloads. A worker must opt in and go available before the sample record can be matched. In a real deployment, GPS requires HTTPS (except localhost), and service availability depends on the configured provider and network.

Run the focused geospatial tests with `npm test`; run the production frontend build with `npm run build`.

Worker signup accepts an ID proof file in the UI; mock mode keeps the verification pending. Set Razorpay and Firebase values in `.env` to enable those integrations. In development without those keys, the related controls remain in demo mode.

## Build and container

```bash
npm run build
docker build -t crewlink-frontend .
docker run --rm -p 8080:80 crewlink-frontend
```