# CREWLINK — API & Database Functions Reference

## 1. PostgreSQL Database Functions (RPC)

### `find_eligible_workers`
Performs PostGIS spatial worker discovery, distance calculation, conflict check, and ranking.

**Signature:**
```sql
find_eligible_workers(
    p_lat NUMERIC,
    p_lng NUMERIC,
    p_radius_km NUMERIC DEFAULT 15.0,
    p_category_name TEXT DEFAULT NULL,
    p_scheduled_date DATE DEFAULT NULL,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    worker_id UUID,
    full_name TEXT,
    phone TEXT,
    rating NUMERIC,
    rating_count INT,
    completed_jobs INT,
    experience_years NUMERIC,
    hourly_rate NUMERIC,
    distance_km NUMERIC,
    lat NUMERIC,
    lng NUMERIC,
    skills TEXT[],
    is_crew_leader BOOLEAN
)
```

### `confirm_crew_allocation`
Atomically assigns crew members to a job ticket with concurrency-safe row-level locks.

**Signature:**
```sql
confirm_crew_allocation(
    p_job_id UUID,
    p_worker_ids UUID[]
)
RETURNS JSONB
```

---

## 2. Supabase Edge Functions

### `POST /functions/v1/create-razorpay-order`
Creates a Razorpay order for an approved job ticket.

**Request:**
```json
{
  "job_id": "893c5240-629a-4c2f-b44a-1ebae98c9261"
}
```

**Response (200 OK):**
```json
{
  "id": "order_H2a0qT1k56",
  "amount": 180000,
  "currency": "INR",
  "job_id": "893c5240-629a-4c2f-b44a-1ebae98c9261"
}
```

### `POST /functions/v1/verify-razorpay-payment`
Cryptographically verifies the HMAC-SHA256 signature returned by the Razorpay Checkout modal and marks the job as `confirmed`.

**Request:**
```json
{
  "job_id": "893c5240-629a-4c2f-b44a-1ebae98c9261",
  "razorpay_order_id": "order_H2a0qT1k56",
  "razorpay_payment_id": "pay_H2a1qT89",
  "razorpay_signature": "e44d32e9a8f..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment verified and job confirmed."
}
```
