# CREWLINK — System Architecture

## 1. System Overview

CREWLINK is a coordinated workforce allocation platform built for on-demand manual labor:
**"One job ticket. One coordinated crew. Multiple workers."**

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│  React 18 + Vite 6 + Tailwind CSS + TanStack Query 5        │
│  Google Maps Platform (with Leaflet fallback)               │
│  Razorpay Checkout Modal                                    │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Supabase Edge           │ │     Supabase Backend       │
│  create-razorpay-order       │ │  PostgreSQL 15 + PostGIS   │
│  verify-razorpay-payment     │ │  Row Level Security (RLS)  │
│  Crypto HMAC-SHA256          │ │  Database Functions & RPC  │
│  Deno runtime                │ │  Realtime Subscriptions    │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## 2. Core Principles & Business Logic

1. **Zero Vehicles:** The platform allocates human workers exclusively. Logistics and moving trucks are separate customer-managed concerns.
2. **PostGIS Proximity Engine:** Worker discovery utilizes PostgreSQL `ST_DWithin` with geography points and GIST spatial indexing.
3. **Crew Leader Support:** Groups and existing labor crews are onboarded via crew leader profiles.
4. **Server-Side Enforcement:** Role enforcement is validated via PostgreSQL Row Level Security (RLS) and security definer functions (`is_admin()`).
5. **Partial Allocation Feasibility:** When fewer workers than requested are available, the customer is provided with transparent options (dispatch available crew with adjusted rate, expand search radius, or reschedule).

---

## 3. Role-Based Experiences

### A. Customer (Requester) Dashboard
- Create job tickets specifying work category, duration, date, time, and worker count.
- Select location with Google Maps geocoding and pin placement.
- Review nearby candidate workers and their proximity.
- Real-time crew tracking and job status monitoring.
- Payment checkout with Razorpay test mode.
- Worker rating and review submission.

### B. Worker Dashboard
- Onboarding with category & skill selection and ID document submission.
- Availability toggle (`available`, `busy`, `offline`) and live location sharing.
- Accept or decline incoming job invitations.
- Active job view with customer location, route directions, and job details.
- Earnings history and rating breakdown.

### C. Admin Dashboard
- Platform health overview and active metrics.
- Worker verification portal: review ID documents and approve or reject accounts.
- User management and account moderation.
- Job tickets overview and dispute resolution.

---

## 4. Security & Compliance

- **Authentication:** Supabase Auth (JWT) with automatic token refresh.
- **Data Isolation:** PostgreSQL Row Level Security (RLS) ensures users can only access or modify records permitted by their role.
- **Payments:** Cryptographic HMAC-SHA256 signature verification in Supabase Edge Functions. No secrets exposed to the frontend client.
- **Location Privacy:** Worker locations are only visible while the worker is actively `online` and has `location_sharing_enabled: true`.
