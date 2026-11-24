import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { demoWorkers, mockJobs } from './mockData.js';
import { distanceInKm, formatDistance, findNearbyWorkers, extractCoordinates } from '../utils/location.js';
import { wait } from './client.js';

export const jobsApi = {
  async list({ status, search } = {}) {
    if (isSupabaseConfigured && supabase) {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          job_assignments (
            id,
            status,
            worker_pay,
            worker:worker_profiles (
              user_id,
              rating,
              profile:profiles (full_name, phone)
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`title.ilike.%${search}%,location_address.ilike.%${search}%,job_code.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map((job) => ({
          id: job.id,
          jobCode: job.job_code,
          type: job.category_name,
          title: job.title,
          description: job.description,
          workers: job.workers_needed,
          duration: job.duration_hours,
          date: `${job.scheduled_date}T${job.scheduled_time}`,
          location: {
            lat: Number(job.location_lat),
            lng: Number(job.location_lng),
            address: job.location_address
          },
          status: job.status,
          price: Number(job.estimated_total),
          crewAllocatedCount: job.crew_allocated_count,
          createdAt: job.created_at,
          crew: (job.job_assignments || []).map((ja) => ({
            id: ja.worker?.user_id,
            name: ja.worker?.profile?.full_name || 'Assigned Worker',
            phone: ja.worker?.profile?.phone,
            rating: Number(ja.worker?.rating || 5.0),
            status: ja.status
          }))
        }));
      }
    }

    // Offline / Mock fallback
    await wait(300);
    return mockJobs
      .filter((job) => {
        const matchesStatus = !status || status === 'all' || job.status === status;
        const address = job.location?.address || job.job_address || '';
        const matchesSearch = !search || `${job.id} ${job.type} ${address}`.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  async get(id) {
    if (isSupabaseConfigured && supabase) {
      const { data: job, error } = await supabase
        .from('jobs')
        .select(`
          *,
          job_assignments (
            id,
            status,
            worker_pay,
            worker:worker_profiles (
              user_id,
              rating,
              completed_jobs,
              profile:profiles (full_name, phone)
            )
          )
        `)
        .eq('id', id)
        .single();

      if (!error && job) {
        return {
          id: job.id,
          jobCode: job.job_code,
          type: job.category_name,
          title: job.title,
          description: job.description,
          workers: job.workers_needed,
          duration: job.duration_hours,
          date: `${job.scheduled_date}T${job.scheduled_time}`,
          location: {
            lat: Number(job.location_lat),
            lng: Number(job.location_lng),
            address: job.location_address
          },
          status: job.status,
          price: Number(job.estimated_total),
          crewAllocatedCount: job.crew_allocated_count,
          createdAt: job.created_at,
          crew: (job.job_assignments || []).map((ja) => ({
            id: ja.worker?.user_id,
            name: ja.worker?.profile?.full_name || 'Assigned Worker',
            phone: ja.worker?.profile?.phone,
            rating: Number(ja.worker?.rating || 5.0),
            status: ja.status
          }))
        };
      }
    }

    await wait(200);
    return mockJobs.find((job) => job.id === id) || null;
  },

  async create(payload) {
    const coords = extractCoordinates(payload.location);
    const lat = coords?.lat || 12.9716;
    const lng = coords?.lng || 77.5946;
    const address = payload.location?.address || payload.address || 'Bengaluru, India';
    const totalEstimate = payload.workers * payload.duration * 300;

    if (isSupabaseConfigured && supabase) {
      const { data: userAuth } = await supabase.auth.getUser();
      const customerId = userAuth?.user?.id;

      if (customerId) {
        const { data: insertedJob, error: insertError } = await supabase
          .from('jobs')
          .insert({
            customer_id: customerId,
            category_name: payload.type || 'Home shifting',
            title: `${payload.type || 'Labor Request'} (${payload.workers} workers)`,
            description: payload.description || '',
            workers_needed: payload.workers,
            duration_hours: payload.duration,
            scheduled_date: (payload.date || new Date().toISOString()).split('T')[0],
            scheduled_time: (payload.date || new Date().toISOString()).split('T')[1]?.slice(0, 5) || '10:00',
            location_lat: lat,
            location_lng: lng,
            location_address: address,
            location_geom: `POINT(${lng} ${lat})`,
            search_radius_km: payload.search_radius_km || 15.0,
            estimated_total: totalEstimate,
            status: payload.worker_ids?.length >= payload.workers ? 'crew_ready' : 'pending_crew'
          })
          .select()
          .single();

        if (!insertError && insertedJob) {
          // If workers were allocated directly, confirm via RPC
          if (payload.worker_ids && payload.worker_ids.length > 0) {
            await supabase.rpc('confirm_crew_allocation', {
              p_job_id: insertedJob.id,
              p_worker_ids: payload.worker_ids
            });
          }

          return {
            ...insertedJob,
            id: insertedJob.id,
            type: insertedJob.category_name,
            location: { lat, lng, address },
            price: totalEstimate,
            workers: insertedJob.workers_needed,
            duration: insertedJob.duration_hours,
            crew: []
          };
        }
      }
    }

    // Offline / Mock fallback
    await wait(600);
    demoWorkers.forEach((w) => {
      if (w.availability_status === 'available') {
        w.last_location_update = new Date().toISOString();
      }
    });

    const freshWorkers = demoWorkers.filter((w) => Date.now() - new Date(w.last_location_update).getTime() <= 5 * 60_000);
    const eligible = findNearbyWorkers(freshWorkers, { lat, lng }, payload.search_radius_km || 15, [payload.type]);
    const eligibleMap = new Map(eligible.map((w) => [w.id, w]));

    const crew = (payload.worker_ids || [])
      .map((workerId) => {
        const worker = demoWorkers.find((item) => item.id === workerId) || eligibleMap.get(workerId);
        if (worker && worker.location) {
          const distance = distanceInKm({ lat, lng }, worker.location);
          return {
            id: worker.id,
            name: worker.name,
            rating: worker.rating,
            distance: formatDistance(distance),
            location: worker.location
          };
        }
        return null;
      })
      .filter(Boolean);

    const job = {
      ...payload,
      id: `CL-${2500 + mockJobs.length}`,
      status: crew.length >= payload.workers ? 'assigned' : 'matching',
      price: totalEstimate,
      createdAt: new Date().toISOString(),
      location: { lat, lng, address },
      crew
    };
    mockJobs.unshift(job);
    return job;
  },

  async cancel(id, reason = 'Cancelled by user') {
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('jobs')
        .update({ status: 'cancelled', cancellation_reason: reason, updated_at: new Date().toISOString() })
        .eq('id', id);
    }

    await wait(300);
    const job = mockJobs.find((item) => item.id === id);
    if (job) job.status = 'cancelled';
    return job;
  },

  async review(id, reviews) {
    if (isSupabaseConfigured && supabase) {
      const { data: userAuth } = await supabase.auth.getUser();
      const reviewerId = userAuth?.user?.id;

      if (reviewerId && Array.isArray(reviews)) {
        const reviewInserts = reviews.map((r) => ({
          job_id: id,
          reviewer_id: reviewerId,
          reviewee_id: r.workerId,
          role: 'customer',
          rating: r.rating || 5,
          comment: r.comment || ''
        }));
        await supabase.from('reviews').insert(reviewInserts);
      }
    }

    await wait(400);
    return { success: true };
  }
};
