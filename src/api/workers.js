import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { demoRequests, demoWorkers, mockJobs } from './mockData.js';
import { distanceInKm, extractCoordinates, findNearbyWorkers } from '../utils/location.js';
import { wait } from './client.js';

export const workersApi = {
  async dashboard() {
    if (isSupabaseConfigured && supabase) {
      const { data: userAuth } = await supabase.auth.getUser();
      const workerId = userAuth?.user?.id;

      if (workerId) {
        const { data: wp } = await supabase
          .from('worker_profiles')
          .select('*')
          .eq('user_id', workerId)
          .single();

        // Query active invitations
        const { data: invitations } = await supabase
          .from('job_invitations')
          .select('*, job:jobs(*)')
          .eq('worker_id', workerId)
          .eq('status', 'pending');

        const activeRequests = (invitations || []).map((inv) => ({
          id: inv.id,
          jobId: inv.job?.job_code || inv.job_id,
          type: inv.job?.category_name || 'Manual Task',
          distance: inv.distance_km || 2.0,
          duration: inv.job?.duration_hours || 2,
          pay: Number(inv.offered_pay),
          address: inv.job?.location_address || 'Address provided on acceptance',
          expiresAt: new Date(inv.expires_at).getTime()
        }));

        return {
          earningsToday: 1840,
          earningsWeek: 6480,
          jobsThisWeek: 9,
          rating: Number(wp?.rating || 5.0),
          verification: wp?.verification_status || 'pending',
          online: wp?.availability_status === 'available',
          locationSharingEnabled: Boolean(wp?.location_sharing_enabled),
          location: wp?.location ? { lat: 12.9716, lng: 77.5946 } : null,
          requests: activeRequests
        };
      }
    }

    await wait(300);
    const worker = demoWorkers[0];
    return {
      earningsToday: 1840,
      earningsWeek: 6480,
      jobsThisWeek: 9,
      rating: 4.8,
      verification: 'approved',
      online: worker.availability_status === 'available',
      locationSharingEnabled: worker.location_sharing_enabled,
      location: worker.location,
      requests: demoRequests.map((request) => ({ ...request, expiresAt: Date.now() + 55_000 }))
    };
  },

  async setAvailability(online, location) {
    if (isSupabaseConfigured && supabase) {
      const { data: userAuth } = await supabase.auth.getUser();
      const workerId = userAuth?.user?.id;
      if (workerId) {
        const updatePayload = {
          availability_status: online ? 'available' : 'offline',
          location_sharing_enabled: online,
          updated_at: new Date().toISOString()
        };
        if (location) {
          const coords = extractCoordinates(location);
          if (coords) {
            updatePayload.location = `POINT(${coords.lng} ${coords.lat})`;
            updatePayload.last_location_update = new Date().toISOString();
          }
        }
        await supabase.from('worker_profiles').update(updatePayload).eq('user_id', workerId);
        return { online, location_sharing_enabled: online, location };
      }
    }

    await wait(200);
    const worker = demoWorkers[0];
    worker.availability_status = online ? 'available' : 'unavailable';
    if (!online) worker.location_sharing_enabled = false;
    if (location) {
      worker.location = location;
      worker.last_location_update = new Date().toISOString();
    }
    return { online, location_sharing_enabled: worker.location_sharing_enabled, location: worker.location };
  },

  async setLocationSharing(enabled, location) {
    if (isSupabaseConfigured && supabase) {
      const { data: userAuth } = await supabase.auth.getUser();
      const workerId = userAuth?.user?.id;
      if (workerId) {
        const updatePayload = {
          location_sharing_enabled: enabled,
          availability_status: enabled ? 'available' : 'offline',
          updated_at: new Date().toISOString()
        };
        if (location) {
          const coords = extractCoordinates(location);
          if (coords) {
            updatePayload.location = `POINT(${coords.lng} ${coords.lat})`;
            updatePayload.last_location_update = new Date().toISOString();
          }
        }
        await supabase.from('worker_profiles').update(updatePayload).eq('user_id', workerId);
        return { enabled, location };
      }
    }

    await wait(200);
    const worker = demoWorkers[0];
    worker.location_sharing_enabled = enabled;
    if (!enabled) worker.availability_status = 'unavailable';
    if (location) {
      worker.location = location;
      worker.last_location_update = new Date().toISOString();
    }
    return { enabled, location: worker.location };
  },

  async updateLocation(location) {
    const coords = extractCoordinates(location);
    if (!coords) return { updated: false };

    if (isSupabaseConfigured && supabase) {
      const { data: userAuth } = await supabase.auth.getUser();
      const workerId = userAuth?.user?.id;
      if (workerId) {
        const now = new Date().toISOString();
        await supabase
          .from('worker_profiles')
          .update({
            location: `POINT(${coords.lng} ${coords.lat})`,
            last_location_update: now,
            updated_at: now
          })
          .eq('user_id', workerId)
          .eq('location_sharing_enabled', true);
        return { updated: true, last_location_update: now };
      }
    }

    const worker = demoWorkers[0];
    if (!worker.location_sharing_enabled || worker.availability_status !== 'available') return { updated: false };
    worker.location = coords;
    worker.last_location_update = new Date().toISOString();
    return { updated: true, last_location_update: worker.last_location_update };
  },

  async nearby(location, radiusKm = 15, skills = []) {
    const targetCoords = extractCoordinates(location);
    if (!targetCoords) return [];

    // Call PostGIS RPC if Supabase is active
    if (isSupabaseConfigured && supabase) {
      const categoryName = skills && skills.length > 0 ? skills[0] : null;
      const { data, error } = await supabase.rpc('find_eligible_workers', {
        p_lat: targetCoords.lat,
        p_lng: targetCoords.lng,
        p_radius_km: radiusKm,
        p_category_name: categoryName,
        p_scheduled_date: new Date().toISOString().split('T')[0],
        p_limit: 25
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((w) => ({
          id: w.worker_id,
          name: w.full_name,
          phone: w.phone,
          rating: Number(w.rating),
          jobs: w.completed_jobs,
          skills: w.skills,
          availability_status: 'available',
          location: { lat: Number(w.lat), lng: Number(w.lng) },
          distance_km: Number(w.distance_km),
          is_crew_leader: w.is_crew_leader
        }));
      }
    }

    // High quality offline fallback with dynamic simulation if outside Bengaluru
    await wait(250);
    demoWorkers.forEach((w) => {
      if (w.availability_status === 'available') {
        w.last_location_update = new Date().toISOString();
      }
    });

    const matched = findNearbyWorkers(demoWorkers, targetCoords, radiusKm, skills);
    if (matched.length > 0) {
      return matched.map((worker) => ({
        id: worker.id,
        name: worker.name,
        rating: worker.rating,
        jobs: worker.jobs,
        skills: worker.skills,
        availability_status: worker.availability_status,
        location: worker.location,
        last_location_update: worker.last_location_update,
        distance_km: worker.distanceKm
      }));
    }

    // Realistic simulated workers in radius of chosen Indian pin
    const sampleProfiles = [
      { name: 'Arjun Verma', skills: ['Home shifting', 'Furniture shifting', 'Loading help', 'General Manual Work'], rating: 4.9, jobs: 88, offsetLat: 0.007, offsetLng: 0.006 },
      { name: 'Kavita Singh', skills: ['Home shifting', 'Loading help', 'Warehouse loading', 'General Manual Work'], rating: 4.8, jobs: 62, offsetLat: -0.008, offsetLng: 0.009 },
      { name: 'Devendra Rao', skills: ['Furniture shifting', 'Loading help', 'General Manual Work'], rating: 4.7, jobs: 45, offsetLat: 0.005, offsetLng: -0.007 }
    ];

    return sampleProfiles
      .map((profile, i) => {
        const workerLoc = {
          lat: Number((targetCoords.lat + profile.offsetLat).toFixed(6)),
          lng: Number((targetCoords.lng + profile.offsetLng).toFixed(6))
        };
        const dist = distanceInKm(targetCoords, workerLoc);
        return {
          id: `sim-worker-${i + 1}`,
          name: profile.name,
          rating: profile.rating,
          jobs: profile.jobs,
          skills: profile.skills,
          availability_status: 'available',
          location_sharing_enabled: true,
          location: workerLoc,
          last_location_update: new Date().toISOString(),
          distance_km: dist
        };
      })
      .filter((w) => w.distance_km <= radiusKm);
  },

  async requests() {
    return this.dashboard().then((res) => res.requests);
  },

  async activeJob() {
    if (isSupabaseConfigured && supabase) {
      const { data: userAuth } = await supabase.auth.getUser();
      const workerId = userAuth?.user?.id;

      if (workerId) {
        const { data: assignment } = await supabase
          .from('job_assignments')
          .select('*, job:jobs(*)')
          .eq('worker_id', workerId)
          .in('status', ['assigned', 'checked_in', 'in_progress'])
          .order('assigned_at', { ascending: false })
          .limit(1)
          .single();

        if (assignment && assignment.job) {
          const j = assignment.job;
          return {
            id: j.id,
            jobCode: j.job_code,
            type: j.category_name,
            title: j.title,
            description: j.description,
            date: `${j.scheduled_date}T${j.scheduled_time}`,
            location: {
              lat: Number(j.location_lat),
              lng: Number(j.location_lng),
              address: j.location_address
            },
            status: j.status,
            pay: Number(assignment.worker_pay),
            workerStatus: assignment.status
          };
        }
      }
    }

    await wait(200);
    const job = mockJobs.find((item) => ['assigned', 'in progress'].includes(item.status));
    if (!job) return null;
    return { ...job, workerLocation: demoWorkers[0].location, pay: Math.round(job.price / Math.max(job.workers, 1)) };
  },

  async respond(requestId, decision) {
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('job_invitations')
        .update({
          status: decision === 'accept' ? 'accepted' : 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);
    }
    await wait(250);
    return { success: true, decision };
  },

  async updateJob(jobId, status) {
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('jobs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', jobId);
    }
    await wait(250);
    const job = mockJobs.find((item) => item.id === jobId);
    if (job) job.status = status;
    return { jobId, status };
  },

  async earnings() {
    await wait(200);
    return {
      total: 28450,
      pending: 1800,
      history: [
        { id: 'CL-2481', task: 'Home shifting', date: 'Today, 9:30 AM', amount: 720 },
        { id: 'CL-2472', task: 'Loading help', date: 'Yesterday', amount: 600 },
        { id: 'CL-2459', task: 'Furniture shifting', date: 'Jun 21', amount: 960 }
      ]
    };
  },

  async profile() {
    if (isSupabaseConfigured && supabase) {
      const { data: userAuth } = await supabase.auth.getUser();
      const workerId = userAuth?.user?.id;
      if (workerId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, worker:worker_profiles(*)')
          .eq('id', workerId)
          .single();

        if (profile) {
          return {
            id: profile.id,
            name: profile.full_name,
            email: profile.email,
            phone: profile.phone,
            rating: Number(profile.worker?.rating || 5.0),
            jobs: profile.worker?.completed_jobs || 0,
            status: profile.worker?.verification_status || 'pending',
            skills: profile.worker?.skills || [],
            is_crew_leader: profile.worker?.is_crew_leader || false
          };
        }
      }
    }
    await wait(200);
    return demoWorkers[0];
  }
};
