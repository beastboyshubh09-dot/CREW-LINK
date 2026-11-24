# CREWLINK — Setup & Configuration Guide

## Prerequisites
- Node.js 18+ (tested on Node v24)
- npm 9+
- A Supabase project (free tier at [supabase.com](https://supabase.com))
- A Google Cloud Platform account with **Maps JavaScript API** enabled
- A Razorpay account with Test Mode API keys

---

## 1. Local Development Setup

### Clone and install dependencies
```bash
git clone https://github.com/beastboyshubh09-dot/CREW-LINK.git
cd CREW-LINK
npm install
```

### Configure environment variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# Google Maps Platform
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...

# Razorpay Test Mode Key
VITE_RAZORPAY_KEY_ID=rzp_test_...

# Set to false to connect to live Supabase backend
VITE_USE_MOCK=false
```

---

## 2. Supabase Database Setup

1. Open your Supabase Project dashboard.
2. Navigate to the **SQL Editor**.
3. Open `supabase/migrations/20261124000001_initial_schema.sql` from this repository.
4. Paste the SQL contents and click **Run**.
5. Create a Storage bucket named `id-proofs` with Public access enabled.

---

## 3. Deploying Supabase Edge Functions

Install the Supabase CLI:
```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-id
```

Set Razorpay Secrets:
```bash
supabase secrets set RAZORPAY_KEY_ID=rzp_test_... RAZORPAY_KEY_SECRET=...
```

Deploy Edge Functions:
```bash
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
```

---

## 4. Running the Application

### Development server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Run automated tests
```bash
npm test
```

### Production build
```bash
npm run build
```
The optimized bundle will be generated under `dist/`.
