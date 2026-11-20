import { api, USE_MOCK, wait } from './client.js';
import { demoRequests, demoWorkers, mockJobs } from './mockData.js';
import { distanceInKm, extractCoordinates, findNearbyWorkers } from '../utils/location.js';

export const workersApi = {
  async dashboard() {
    if (!USE_MOCK) return (await api.get('/workers/me/dashboard/')).data;
    await wait();
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
    if (!USE_MOCK) return (await api.patch('/workers/me/availability/', { online, location })).data;
    await wait(250);
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
    if (!USE_MOCK) return (await api.patch('/workers/me/location-sharing/', { enabled, location })).data;
    await wait(250);
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
    if (!USE_MOCK) return (await api.put('/workers/me/location/', { ...location, updated_at: new Date().toISOString() })).data;
    const worker = demoWorkers[0];
    if (!worker.location_sharing_enabled || worker.availability_status !== 'available') return { updated: false };
    worker.location = location;
    worker.last_location_update = new Date().toISOString();
    return { updated: true, last_location_update: worker.last_location_update };
  },
  async nearby(location, radiusKm, skills) {
    if (!USE_MOCK) {
      const { data } = await api.get('/workers/nearby/', {
        params: { lat: location.lat, lng: location.lng, radius_km: radiusKm, skills: (skills || []).join(',') }
      });
      return data;
    }
    await wait(250);

    // Keep active demo workers' timestamps fresh in mock mode
    demoWorkers.forEach((w) => {
      if (w.availability_status === 'available') {
        w.last_location_update = new Date().toISOString();
      }
    });

    const targetCoords = extractCoordinates(location);
    if (!targetCoords) return [];

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

    // In demo mode: if user searches outside Bengaluru, provide realistic simulated workers around chosen location
    const sampleProfiles = [
      { name: 'Arjun Verma', skills: ['Home shifting', 'Furniture shifting', 'Loading help', 'Warehouse loading', 'Other manual work'], rating: 4.9, jobs: 88, offsetLat: 0.007, offsetLng: 0.006 },
      { name: 'Kavita Singh', skills: ['Home shifting', 'Loading help', 'Warehouse loading', 'Other manual work'], rating: 4.8, jobs: 62, offsetLat: -0.008, offsetLng: 0.009 },
      { name: 'Devendra Rao', skills: ['Furniture shifting', 'Loading help', 'Other manual work'], rating: 4.7, jobs: 45, offsetLat: 0.005, offsetLng: -0.007 }
    ];

    const generated = sampleProfiles
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

    return generated;
  },
  async requests() {
    if (!USE_MOCK) return (await api.get('/workers/me/requests/')).data;
    await wait();
    return demoRequests.map((request) => ({ ...request, expiresAt: Date.now() + 55_000 }));
  },
  async activeJob() {
    if (!USE_MOCK) return (await api.get('/workers/me/active-job/')).data;
    await wait();
    const job = mockJobs.find((item) => ['assigned', 'in progress'].includes(item.status));
    if (!job) return null;
    return { ...job, workerLocation: demoWorkers[0].location, pay: Math.round(job.price / Math.max(job.workers, 1)) };
  },
  async respond(requestId, decision) {
    if (!USE_MOCK) return (await api.post(`/workers/requests/${requestId}/${decision}/`)).data;
    await wait(350);
    return { success: true, decision };
  },
  async updateJob(jobId, status) {
    if (!USE_MOCK) return (await api.patch(`/workers/jobs/${jobId}/status/`, { status })).data;
    await wait(350);
    const job = mockJobs.find((item) => item.id === jobId);
    if (job) job.status = status;
    return { jobId, status };
  },
  async earnings() {
    if (!USE_MOCK) return (await api.get('/workers/me/earnings/')).data;
    await wait();
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
    if (!USE_MOCK) return (await api.get('/workers/me/')).data;
    await wait();
    return demoWorkers[0];
  }
};
