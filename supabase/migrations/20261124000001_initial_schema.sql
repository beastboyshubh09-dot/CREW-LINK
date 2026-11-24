-- Migration: 20261124000001_initial_schema.sql
-- Description: Core CREWLINK schema with PostGIS, RLS, triggers, and functions

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Custom ENUM Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'worker', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE availability_status AS ENUM ('available', 'busy', 'offline');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM (
        'draft',
        'pending_crew',
        'partially_allocated',
        'crew_ready',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'disputed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE assignment_status AS ENUM ('assigned', 'checked_in', 'in_progress', 'completed', 'no_show', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'captured', 'refunded', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved', 'dismissed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'customer',
    profile_picture_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Work Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    min_workers INT NOT NULL DEFAULT 1,
    default_hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 300.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Worker Profiles Table
CREATE TABLE IF NOT EXISTS public.worker_profiles (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    skills TEXT[] NOT NULL DEFAULT '{}',
    experience_years NUMERIC(4, 1) DEFAULT 1.0,
    hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 300.00,
    daily_rate NUMERIC(10, 2),
    location GEOGRAPHY(Point, 4326),
    location_address TEXT,
    preferred_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    verification_status verification_status NOT NULL DEFAULT 'pending',
    availability_status availability_status NOT NULL DEFAULT 'offline',
    location_sharing_enabled BOOLEAN NOT NULL DEFAULT false,
    last_location_update TIMESTAMPTZ,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
    rating_count INT NOT NULL DEFAULT 0,
    completed_jobs INT NOT NULL DEFAULT 0,
    no_show_count INT NOT NULL DEFAULT 0,
    is_crew_leader BOOLEAN NOT NULL DEFAULT false,
    crew_leader_id UUID REFERENCES public.worker_profiles(user_id) ON DELETE SET NULL,
    id_proof_url TEXT,
    id_proof_type TEXT,
    verification_notes TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Jobs Table
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_code TEXT UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    workers_needed INT NOT NULL CHECK (workers_needed >= 1),
    duration_hours INT NOT NULL CHECK (duration_hours >= 1),
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    location_lat NUMERIC(10, 6) NOT NULL,
    location_lng NUMERIC(10, 6) NOT NULL,
    location_address TEXT NOT NULL,
    location_geom GEOGRAPHY(Point, 4326) NOT NULL,
    search_radius_km NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    status job_status NOT NULL DEFAULT 'pending_crew',
    rate_per_worker_hour NUMERIC(10, 2) NOT NULL DEFAULT 300.00,
    estimated_total NUMERIC(10, 2) NOT NULL,
    final_total NUMERIC(10, 2),
    crew_allocated_count INT NOT NULL DEFAULT 0,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Auto-generate job code (CL-1000, etc.)
CREATE SEQUENCE IF NOT EXISTS job_code_seq START WITH 2500;

CREATE OR REPLACE FUNCTION generate_job_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.job_code IS NULL THEN
        NEW.job_code := 'CL-' || nextval('job_code_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_job_code ON public.jobs;
CREATE TRIGGER trg_generate_job_code
BEFORE INSERT ON public.jobs
FOR EACH ROW EXECUTE FUNCTION generate_job_code();

-- 7. Job Invitations Table (For dispatching to candidate workers)
CREATE TABLE IF NOT EXISTS public.job_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.worker_profiles(user_id) ON DELETE CASCADE,
    status invitation_status NOT NULL DEFAULT 'pending',
    offered_pay NUMERIC(10, 2) NOT NULL,
    distance_km NUMERIC(6, 2),
    expires_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_job_worker_invitation UNIQUE (job_id, worker_id)
);

-- 8. Job Assignments Table (Confirmed crew members)
CREATE TABLE IF NOT EXISTS public.job_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.worker_profiles(user_id) ON DELETE CASCADE,
    status assignment_status NOT NULL DEFAULT 'assigned',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    checked_in_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    worker_pay NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    CONSTRAINT uq_job_worker_assignment UNIQUE (job_id, worker_id)
);

-- 9. Payments Table (Razorpay Integration)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status payment_status NOT NULL DEFAULT 'pending',
    payment_method TEXT,
    raw_response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_job_reviewer_reviewee UNIQUE (job_id, reviewer_id, reviewee_id)
);

-- 11. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    link TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Disputes Table
CREATE TABLE IF NOT EXISTS public.disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    reported_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES public.worker_profiles(user_id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT NOT NULL,
    status dispute_status NOT NULL DEFAULT 'open',
    resolution_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. SPATIAL & PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_worker_profiles_location ON public.worker_profiles USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_jobs_location_geom ON public.jobs USING GIST (location_geom);
CREATE INDEX IF NOT EXISTS idx_jobs_customer_id ON public.jobs (customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_job_assignments_job_id ON public.job_assignments (job_id);
CREATE INDEX IF NOT EXISTS idx_job_assignments_worker_id ON public.job_assignments (worker_id);
CREATE INDEX IF NOT EXISTS idx_job_invitations_job_id ON public.job_invitations (job_id);
CREATE INDEX IF NOT EXISTS idx_job_invitations_worker_id ON public.job_invitations (worker_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_job_id ON public.payments (job_id);

-- 14. AUTH HOOK & PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'customer')
    );

    -- If registered as worker, create worker_profiles record
    IF (NEW.raw_user_meta_data->>'role') = 'worker' THEN
        INSERT INTO public.worker_profiles (
            user_id,
            skills,
            is_crew_leader,
            verification_status,
            availability_status
        )
        VALUES (
            NEW.id,
            COALESCE(
                ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'skills')),
                ARRAY['General Labor']::text[]
            ),
            COALESCE((NEW.raw_user_meta_data->>'is_crew_leader')::boolean, false),
            'pending',
            'offline'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 15. POSTGIS SPATIAL WORKER DISCOVERY FUNCTION
CREATE OR REPLACE FUNCTION public.find_eligible_workers(
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
) AS $$
DECLARE
    center_point GEOGRAPHY;
BEGIN
    center_point := ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography;

    RETURN QUERY
    SELECT
        p.id AS worker_id,
        p.full_name,
        p.phone,
        wp.rating,
        wp.rating_count,
        wp.completed_jobs,
        wp.experience_years,
        wp.hourly_rate,
        ROUND((ST_Distance(wp.location, center_point) / 1000.0)::numeric, 2) AS distance_km,
        ST_Y(wp.location::geometry)::numeric AS lat,
        ST_X(wp.location::geometry)::numeric AS lng,
        wp.skills,
        wp.is_crew_leader
    FROM public.worker_profiles wp
    JOIN public.profiles p ON p.id = wp.user_id
    WHERE
        wp.verification_status = 'approved'
        AND wp.availability_status = 'available'
        AND wp.location_sharing_enabled = true
        AND wp.location IS NOT NULL
        -- PostGIS spatial radius check
        AND ST_DWithin(wp.location, center_point, p_radius_km * 1000.0)
        -- Skill/Category match (if category specified, worker must have related skill or general labor)
        AND (
            p_category_name IS NULL
            OR 'General Labor' = ANY(wp.skills)
            OR p_category_name = ANY(wp.skills)
            OR EXISTS (
                SELECT 1 FROM unnest(wp.skills) s
                WHERE s ILIKE '%' || p_category_name || '%'
            )
        )
        -- Worker must not already be booked on the scheduled date
        AND NOT EXISTS (
            SELECT 1 FROM public.job_assignments ja
            JOIN public.jobs j ON j.id = ja.job_id
            WHERE ja.worker_id = wp.user_id
              AND ja.status IN ('assigned', 'in_progress')
              AND j.scheduled_date = p_scheduled_date
        )
    ORDER BY
        distance_km ASC,
        wp.rating DESC,
        wp.completed_jobs DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 16. ATOMIC ALLOCATION & CREW ASSIGNMENT RPC
CREATE OR REPLACE FUNCTION public.confirm_crew_allocation(
    p_job_id UUID,
    p_worker_ids UUID[]
)
RETURNS JSONB AS $$
DECLARE
    v_job RECORD;
    v_worker_id UUID;
    v_worker_pay NUMERIC;
    v_assigned_count INT := 0;
BEGIN
    -- Lock the job record for update
    SELECT * INTO v_job FROM public.jobs WHERE id = p_job_id FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Job not found';
    END IF;

    IF v_job.status NOT IN ('pending_crew', 'partially_allocated') THEN
        RAISE EXCEPTION 'Job is not open for crew allocation (current status: %)', v_job.status;
    END IF;

    v_worker_pay := ROUND((v_job.estimated_total / GREATEST(v_job.workers_needed, 1))::numeric, 2);

    -- Insert assignments atomically
    FOREACH v_worker_id IN ARRAY p_worker_ids LOOP
        -- Check worker is not already assigned
        IF NOT EXISTS (SELECT 1 FROM public.job_assignments WHERE job_id = p_job_id AND worker_id = v_worker_id) THEN
            INSERT INTO public.job_assignments (job_id, worker_id, status, worker_pay)
            VALUES (p_job_id, v_worker_id, 'assigned', v_worker_pay);
            v_assigned_count := v_assigned_count + 1;
        END IF;
    END LOOP;

    -- Update job status based on total allocated crew
    SELECT count(*) INTO v_assigned_count FROM public.job_assignments WHERE job_id = p_job_id;

    UPDATE public.jobs
    SET
        crew_allocated_count = v_assigned_count,
        status = CASE
            WHEN v_assigned_count >= workers_needed THEN 'crew_ready'::job_status
            ELSE 'partially_allocated'::job_status
        END,
        updated_at = now()
    WHERE id = p_job_id;

    -- Send notifications to assigned workers
    FOREACH v_worker_id IN ARRAY p_worker_ids LOOP
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
            v_worker_id,
            'You are assigned to a new crew!',
            'Job: ' || v_job.title || ' at ' || v_job.location_address || ' on ' || v_job.scheduled_date,
            'job_assigned',
            '/app/worker/active'
        );
    END LOOP;

    RETURN jsonb_build_object(
        'job_id', p_job_id,
        'allocated_count', v_assigned_count,
        'status', CASE WHEN v_assigned_count >= v_job.workers_needed THEN 'crew_ready' ELSE 'partially_allocated' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Public profiles are readable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins have full access to profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.is_admin());

-- Worker Profiles Policies
CREATE POLICY "Approved worker profiles are readable by authenticated users"
    ON public.worker_profiles FOR SELECT
    TO authenticated
    USING (verification_status = 'approved' OR user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Workers can update their own worker profile"
    ON public.worker_profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins have full access to worker profiles"
    ON public.worker_profiles FOR ALL
    TO authenticated
    USING (public.is_admin());

-- Categories Policies
CREATE POLICY "Categories are readable by everyone"
    ON public.categories FOR SELECT
    TO authenticated, anon
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can modify categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (public.is_admin());

-- Jobs Policies
CREATE POLICY "Customers can see their own jobs"
    ON public.jobs FOR SELECT
    TO authenticated
    USING (customer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Assigned workers can see the job"
    ON public.jobs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.job_assignments
            WHERE job_id = public.jobs.id AND worker_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.job_invitations
            WHERE job_id = public.jobs.id AND worker_id = auth.uid()
        )
    );

CREATE POLICY "Customers can create jobs"
    ON public.jobs FOR INSERT
    TO authenticated
    WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update their own jobs"
    ON public.jobs FOR UPDATE
    TO authenticated
    USING (customer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins have full access to jobs"
    ON public.jobs FOR ALL
    TO authenticated
    USING (public.is_admin());

-- Job Assignments Policies
CREATE POLICY "Users can see assignments for their jobs or themselves"
    ON public.job_assignments FOR SELECT
    TO authenticated
    USING (
        worker_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.jobs WHERE id = public.job_assignments.job_id AND customer_id = auth.uid())
        OR public.is_admin()
    );

CREATE POLICY "Workers can update their check-in status"
    ON public.job_assignments FOR UPDATE
    TO authenticated
    USING (worker_id = auth.uid() OR public.is_admin());

-- Job Invitations Policies
CREATE POLICY "Workers can see and respond to their own invitations"
    ON public.job_invitations FOR ALL
    TO authenticated
    USING (worker_id = auth.uid() OR public.is_admin());

-- Payments Policies
CREATE POLICY "Customers can see their own payments"
    ON public.payments FOR SELECT
    TO authenticated
    USING (customer_id = auth.uid() OR public.is_admin());

CREATE POLICY "Payments can be inserted during checkout"
    ON public.payments FOR INSERT
    TO authenticated
    WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Admins can view all payments"
    ON public.payments FOR ALL
    TO authenticated
    USING (public.is_admin());

-- Reviews Policies
CREATE POLICY "Reviews are viewable by authenticated users"
    ON public.reviews FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can write reviews for jobs they participated in"
    ON public.reviews FOR INSERT
    TO authenticated
    WITH CHECK (reviewer_id = auth.uid());

-- Notifications Policies
CREATE POLICY "Users can see and manage their own notifications"
    ON public.notifications FOR ALL
    TO authenticated
    USING (user_id = auth.uid());

-- Disputes Policies
CREATE POLICY "Users can see disputes for jobs they belong to"
    ON public.disputes FOR SELECT
    TO authenticated
    USING (reported_by = auth.uid() OR worker_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can file disputes"
    ON public.disputes FOR INSERT
    TO authenticated
    WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Admins can manage disputes"
    ON public.disputes FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 18. INITIAL SEED DATA FOR CATEGORIES
INSERT INTO public.categories (name, slug, description, icon, min_workers, default_hourly_rate)
VALUES
    ('Home Shifting', 'home-shifting', 'Moving household items, packing, loading & unloading furniture and boxes.', 'Truck', 2, 350.00),
    ('Loading Help', 'loading-help', 'Loading and unloading trucks, containers, or delivery vans.', 'PackageCheck', 1, 300.00),
    ('Furniture Shifting', 'furniture-shifting', 'Rearranging heavy furniture, tables, beds, and almirahs within homes or offices.', 'Armchair', 2, 300.00),
    ('Warehouse Loading', 'warehouse-loading', 'Stacking, sorting, inventory shifting, and pallet unloading.', 'Warehouse', 2, 280.00),
    ('Construction / Demolition Clean-up', 'construction-clean', 'Debris clearing, material shifting, and post-renovation site labor.', 'HardHat', 2, 320.00),
    ('General Manual Work', 'general-manual', 'Short-term manual assistance, garden clearing, event set-up.', 'Wrench', 1, 250.00)
ON CONFLICT (name) DO NOTHING;
