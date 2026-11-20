import { api, USE_MOCK, wait } from './client';
import { demoWorkers, mockJobs } from './mockData';
import { distanceInKm, formatDistance, findNearbyWorkers } from '../utils/location';

export const jobsApi = {
  async list({ status, search } = {}) {
    if (!USE_MOCK) return (await api.get('/jobs/', { params: { status, search } })).data;
    await wait();
    return mockJobs.filter((job) => (!status || status === 'all' || job.status === status) && (!search || `${job.id} ${job.type} ${job.location.address}`.toLowerCase().includes(search.toLowerCase()))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  async get(id) {
    if (!USE_MOCK) return (await api.get(`/jobs/${id}/`)).data;
    await wait(300);
    return mockJobs.find((job) => job.id === id) || null;
  },
  async create(payload) {
    if (!USE_MOCK) return (await api.post('/jobs/', payload)).data;
    await wait(700);
    const freshWorkers = demoWorkers.filter((worker) => Date.now() - new Date(worker.last_location_update).getTime() <= 2 * 60_000);
    const eligible = findNearbyWorkers(freshWorkers, payload.location, payload.search_radius_km, [payload.type]);
    const eligibleIds = new Set(eligible.map((worker) => worker.id));
    const crew = (payload.worker_ids || []).filter((id) => eligibleIds.has(id)).map((workerId) => {
      const worker = demoWorkers.find((item) => item.id === workerId);
      const distance = worker && distanceInKm(payload.location, worker.location);
      return worker && { id: worker.id, name: worker.name, rating: worker.rating, distance: formatDistance(distance), location: worker.location };
    }).filter(Boolean);
    const job = { ...payload, id: `CL-${2500 + mockJobs.length}`, status: crew.length >= payload.workers ? 'assigned' : 'matching', price: payload.workers * payload.duration * 300, createdAt: new Date().toISOString(), crew };
    mockJobs.unshift(job);
    return job;
  },
  async cancel(id) {
    if (!USE_MOCK) return (await api.post(`/jobs/${id}/cancel/`)).data;
    await wait(350);
    const job = mockJobs.find((item) => item.id === id);
    if (job) job.status = 'cancelled';
    return job;
  },
  async review(id, reviews) {
    if (!USE_MOCK) return (await api.post(`/jobs/${id}/reviews/`, { reviews })).data;
    await wait(500);
    return { success: true };
  }
};