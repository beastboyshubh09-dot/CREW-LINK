# CREWLINK — Project Audit

**Audit Date:** 2026-11-24  
**Repository:** `https://github.com/beastboyshubh09-dot/CREW-LINK`  
**Branch:** `main` (3 commits, clean working tree)

---

## 1. Existing Architecture

```
crewlink-frontend/
├── src/
│   ├── api/              # API layer (all mock, no real backend)
│   │   ├── admin.js      # Admin endpoints → mock data
│   │   ├── auth.js       # Auth endpoints → hardcoded demo accounts
│   │   ├── client.js     # Axios instance + token interceptors
│   │   ├── jobs.js       # Job CRUD → in-memory arrays
│   │   ├── mockData.js   # All demo data (workers, jobs, users)
│   │   ├── payments.js   # Razorpay Checkout skeleton
│   │   └── workers.js    # Worker endpoints → in-memory arrays
│   ├── components/
│   │   ├── layout/AppShell.jsx      # Main layout with sidebar nav
│   │   ├── map/LocationMap.jsx      # Leaflet + OpenStreetMap
│   │   └── ui/                      # ResourceStates, StatusBadge
│   ├── context/
│   │   ├── AuthContext.jsx          # useReducer auth (localStorage)
│   │   └── ToastContext.jsx         # Toast notifications
│   ├── hooks/
│   │   ├── useLiveEvents.js         # SSE hook (not connected)
│   │   └── useWebSocket.js          # WebSocket hook (not connected)
│   ├── pages/
│   │   ├── admin/                   # Overview, Jobs, People, Verifications
│   │   ├── requester/               # Overview, PostJob, MyJobs, JobDetail
│   │   ├── worker/                  # Overview, Requests, ActiveJob, Earnings, Profile
│   │   └── public/                  # LandingPage, AuthPage
│   ├── routes/ProtectedRoute.jsx    # Client-side role guard
│   ├── utils/
│   │   ├── location.js              # Haversine, geolocation, worker search
│   │   ├── location.test.js         # 7 unit tests
│   │   └── pushNotifications.js     # Firebase push (empty config)
│   ├── App.jsx                      # Route definitions
│   ├── main.jsx                     # Entry point
│   └── styles.css                   # Tailwind + Leaflet fixes
├── public/
│   ├── favicon.svg
│   ├── firebase-messaging-sw.js     # Firebase service worker
│   └── offline.html                 # PWA offline fallback
├── dist/                            # Built output (committed)
├── Dockerfile                       # Nginx-based container
├── nginx.conf
├── package.json
├── vite.config.js
├── tailwind.config.js
└── .env / .env.example
```

### Technology Stack (Current)

| Layer | Technology | Version |
|-------|-----------|---------|
| UI Framework | React | 18.3.1 |
| Build Tool | Vite | 6.0.5 |
| Styling | Tailwind CSS | 3.4.16 |
| Routing | React Router | 6.30.3 |
| Data Fetching | TanStack Query | 5.62.8 |
| HTTP Client | Axios | 1.7.9 |
| Maps | Leaflet + react-leaflet | 1.9.4 / 4.2.1 |
| Push Notifications | Firebase Messaging | 0.12.23 |
| PWA | vite-plugin-pwa | 0.21.1 |

---

## 2. Current Implementation Status

### ✅ Implemented (Frontend UI Only)

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page | Complete | Responsive, branded |
| Login / Register UI | Complete | Role selector, form validation |
| Customer dashboard | Complete | Overview, job list, job detail |
| Worker dashboard | Complete | Overview, requests, earnings, profile |
| Admin dashboard | Complete | Overview, people, jobs, verifications |
| Map component | Complete | Leaflet with search, markers, reverse geocoding |
| AppShell / navigation | Complete | Sidebar, role-based nav, mobile responsive |
| Toast notifications | Complete | Context-based toast system |
| Protected routes | Complete | Client-side role check |
| Location utilities | Complete | Haversine, coordinate extraction, 7 tests |
| PWA support | Complete | Service worker, manifest, offline page |
| Docker deployment | Complete | Nginx container config |

### ⚠️ Partially Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Authentication | Mock only | Hardcoded demo accounts, no real auth |
| Job creation | Mock only | In-memory array, no persistence |
| Worker search | Mock only | Client-side Haversine on demo data |
| Payment | Skeleton | Razorpay Checkout JS loaded but no backend order/verify |
| Real-time updates | Hooks exist | useLiveEvents, useWebSocket — not connected |
| Push notifications | Config exists | Firebase setup but no credentials configured |

### ❌ Not Implemented

| Feature | Required |
|---------|----------|
| **Database** | No PostgreSQL, no schema, no migrations |
| **Backend / API** | No server, no Supabase, no Edge Functions |
| **Real authentication** | No password hashing, no sessions, no JWT validation |
| **Server-side authorization** | No RLS, no role verification |
| **Worker verification workflow** | UI exists but approval has no effect |
| **Crew allocation engine** | No spatial queries, no booking logic |
| **Payment backend** | No order creation, no signature verification |
| **Worker document storage** | No file upload infrastructure |
| **Crew leader onboarding** | Not designed |
| **Notification system** | Firebase configured but should be database-backed |
| **Review / rating system** | API stub returns `{ success: true }` |
| **Dispute resolution** | Not designed |

---

## 3. Identified Bugs

| # | Bug | Severity | Location |
|---|-----|----------|----------|
| 1 | `dist/` committed to repo — stale build artifacts in version control | Low | Root |
| 2 | `run` package in dependencies — appears unused, potential security risk | Low | package.json |
| 3 | Firebase dependencies present but user explicitly prohibits Firebase | Medium | package.json |
| 4 | `firebase-messaging-sw.js` service worker references unconfigured Firebase | Medium | public/ |
| 5 | Mock login accepts any email without validation | High | api/auth.js |
| 6 | All authorization is client-side only — trivially bypassable | Critical | ProtectedRoute.jsx |
| 7 | `mockData.js` uses `URL.createObjectURL` during registration which leaks memory | Low | api/auth.js:31 |
| 8 | Worker freshness window mismatch: `jobs.js` uses 2min, `PostJob.jsx` uses 5min | Low | api/jobs.js:34 |
| 9 | `demoAccounts` in auth.js has user 'u-202 Arjun Singh' who doesn't exist in `demoWorkers` | Low | api/auth.js:6 |

---

## 4. Security Concerns

| # | Concern | Severity |
|---|---------|----------|
| 1 | No server-side authentication — anyone can call API as any role | Critical |
| 2 | No input sanitization on job creation | High |
| 3 | Tokens are demo strings stored in localStorage — no real JWT | Critical |
| 4 | No CSRF protection | Medium |
| 5 | No rate limiting | Medium |
| 6 | `.env` with actual values committed to repo | Medium |
| 7 | Axios base URL points to `localhost:8000` — no server exists | Low |
| 8 | No Content Security Policy headers | Medium |

---

## 5. What Can Be Reused

### Keep As-Is
- **Tailwind design system** — `tailwind.config.js` with `forest` palette, Manrope/DM Sans fonts, `shadow-lift`
- **AppShell layout** — Responsive sidebar, role-based navigation
- **UI components** — ResourceStates (Loading/Empty/Error), StatusBadge, ToastContext
- **Route structure** — Lazy loading, role-based nesting
- **Page layouts** — All dashboard pages have solid responsive designs
- **Location utilities** — `extractCoordinates`, `distanceInKm`, `formatDistance`, `findNearbyWorkers`, `getBrowserLocation`
- **PWA configuration** — Service worker, offline page, manifest

### Keep with Modifications
- **API layer** — Replace mock implementations with Supabase queries; keep the interface patterns
- **AuthContext** — Replace localStorage auth with Supabase Auth subscription
- **ProtectedRoute** — Add server-side session verification
- **Payment module** — Connect Razorpay Checkout to Supabase Edge Function for order/verify
- **Map component** — Replace Leaflet with Google Maps (per user requirement)

### Remove
- `@firebase/app`, `@firebase/messaging` — User explicitly prohibits Firebase
- `run` package — Unused dependency
- `public/firebase-messaging-sw.js` — Firebase service worker
- `src/utils/pushNotifications.js` — Firebase-based push notifications
- `dist/` directory — Should not be committed (add to `.gitignore`)
- `src/api/mockData.js` — Will be converted to seed data

---

## 6. Recommended Implementation Sequence

### Phase 1: Foundation
1. Install Supabase JS client, Google Maps, Lucide React
2. Remove Firebase, `run` package
3. Create Supabase client initialization (`src/lib/supabase.js`)
4. Update environment variables
5. Update `.gitignore`

### Phase 2: Database
6. Design normalized PostgreSQL schema (13+ tables)
7. Write SQL migrations with PostGIS, UUIDs, constraints, indexes
8. Write Row Level Security policies
9. Create database functions and triggers

### Phase 3: Authentication
10. Rewrite auth API → Supabase Auth
11. Rewrite AuthContext → Supabase session subscription
12. Update ProtectedRoute → verify Supabase session
13. Create profile-creation trigger

### Phase 4: Core Features
14. Rewrite jobs API → Supabase queries
15. Rewrite workers API → Supabase queries
16. Rewrite admin API → Supabase queries
17. Create work categories management

### Phase 5: Crew Allocation Engine
18. Create PostGIS-based worker discovery function
19. Create worker ranking algorithm
20. Create partial allocation with options
21. Create invitation system
22. Create concurrency-safe booking

### Phase 6: Integrations
23. Replace Leaflet with Google Maps
24. Create Razorpay Edge Functions (order + verify + webhook)
25. Set up Supabase Realtime subscriptions
26. Create database-backed notification system

### Phase 7: Testing & Documentation
27. Write unit tests (Vitest)
28. Write integration tests
29. Write E2E tests (Playwright)
30. Create setup guide, API docs, deployment guide

---

## 7. Required Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Razorpay (frontend - publishable key only)
VITE_RAZORPAY_KEY_ID=your-razorpay-key-id

# Supabase Edge Function Secrets (not exposed to frontend)
# RAZORPAY_KEY_ID=your-razorpay-key-id
# RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

---

## 8. Blockers

| Blocker | Impact | Resolution |
|---------|--------|------------|
| No Supabase project credentials | Cannot connect to real database/auth | User must create Supabase project and provide URL + anon key |
| No Google Maps API key | Cannot use Google Maps (can build integration code) | User must create Google Cloud project with Maps JS API enabled |
| No Razorpay credentials | Cannot test payments | User must create Razorpay account and provide test mode credentials |

**Strategy:** Build the entire integration layer, database schema, and application logic now. All external service connections will work immediately once credentials are provided via environment variables.
