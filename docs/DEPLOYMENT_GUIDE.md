# CREWLINK — Deployment Guide

## 1. Frontend Web App Deployment (Vercel / Netlify / Cloudflare Pages)

### Build Command
```bash
npm run build
```

### Output Directory
```
dist
```

### Environment Variables
Configure the following in your hosting provider's dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_RAZORPAY_KEY_ID`
- `VITE_USE_MOCK=false`

---

## 2. Docker Deployment

The repository includes a ready-to-run multi-stage Dockerfile and optimized `nginx.conf`.

### Build Docker Image
```bash
docker build -t crewlink:latest .
```

### Run Docker Container
```bash
docker run -d -p 80:80 --name crewlink crewlink:latest
```

The container automatically serves the static PWA single-page application with gzip compression and client-side routing fallback.
