# CREWLINK

**One job ticket. One coordinated crew. Multiple workers.**

CREWLINK is an on-demand, coordinated workforce allocation platform for short-term manual labor (home shifting, loading help, furniture moving, and warehouse tasks). Instead of independently finding and bargaining with individual laborers, customers create a single ticket, and CREWLINK discovers, assembles, and coordinates a verified crew nearby.

---

## Key Capabilities

- **PostGIS Spatial Matching:** Proximity discovery powered by PostgreSQL `ST_DWithin` and spatial indexing (`GIST`).
- **Coordinated Crew Allocation:** Concurrency-safe atomic crew booking with partial allocation options.
- **Three Role-Based Dashboards:** Customer (Requester), Worker, and Platform Administrator.
- **Google Maps Integration:** Location selection, Places Autocomplete, and driving route rendering.
- **Secure Payments:** Server-side Razorpay order generation and cryptographic HMAC-SHA256 signature verification via Supabase Edge Functions.
- **Worker Verification & Crew Leaders:** ID proof review portal, skill categories, and support for crew leaders representing existing groups.
- **Zero Vehicles:** Purely focused on manual workforce allocation.

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 6, Tailwind CSS, TanStack Query 5, React Router 6, Lucide Icons |
| **Backend & Database** | Supabase (PostgreSQL 15 + PostGIS Extension, Supabase Auth, Storage, Edge Functions) |
| **Maps & Routing** | Google Maps Platform (`@react-google-maps/api`) with Leaflet fallback |
| **Payments** | Razorpay Checkout SDK & Supabase Deno Edge Functions |
| **Testing** | Node.js Test Runner (`node --test`), 100% Passing |

---

## Quick Start

### 1. Installation
```bash
git clone https://github.com/beastboyshubh09-dot/CREW-LINK.git
cd CREW-LINK
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Fill in your Supabase, Google Maps, and Razorpay credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id
VITE_USE_MOCK=false
```
*(If credentials are not yet configured, the application smoothly runs in offline demo mode).*

### 3. Database Migration
Run the SQL migration in `supabase/migrations/20261124000001_initial_schema.sql` in your Supabase SQL Editor.

### 4. Run Development Server
```bash
npm run dev
```

### 5. Automated Tests & Build
```bash
npm test
npm run build
```

---

## Comprehensive Documentation

- [Project Audit](file:///c:/Users/Sohan/CREWLINK/CREW-LINK/docs/PROJECT_AUDIT.md) — Comprehensive repository audit, identified issues, and roadmap.
- [Database Schema](file:///c:/Users/Sohan/CREWLINK/CREW-LINK/docs/DATABASE_SCHEMA.md) — PostgreSQL tables, PostGIS indexes, RLS policies, and triggers.
- [System Architecture](file:///c:/Users/Sohan/CREWLINK/CREW-LINK/docs/ARCHITECTURE.md) — Core principles, role experiences, and security model.
- [Setup & Configuration Guide](file:///c:/Users/Sohan/CREWLINK/CREW-LINK/docs/SETUP_GUIDE.md) — Step-by-step local and cloud deployment instructions.
- [API Documentation](file:///c:/Users/Sohan/CREWLINK/CREW-LINK/docs/API_DOCUMENTATION.md) — Edge Functions and PostgreSQL RPC reference.
- [Testing & QA Report](file:///c:/Users/Sohan/CREWLINK/CREW-LINK/docs/TESTING_REPORT.md) — Test matrix and production build results.
- [Deployment Guide](file:///c:/Users/Sohan/CREWLINK/CREW-LINK/docs/DEPLOYMENT_GUIDE.md) — Docker, Vercel, and Netlify deployment instructions.
