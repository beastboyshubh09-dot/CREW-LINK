import { api, USE_MOCK, wait } from './client';
import { demoUsers, demoWorkers, mockJobs } from './mockData';

export const adminApi = {
  async overview() {
    if (!USE_MOCK) return (await api.get('/admin/overview/')).data;
    await wait();
    return { users: 1248, verifiedWorkers: 384, activeJobs: 28, revenue: 842600, pendingVerifications: demoWorkers.filter((worker) => worker.status === 'pending').length, weekly: [32, 45, 40, 62, 54, 72, 66] };
  },
  async verifications() {
    if (!USE_MOCK) return (await api.get('/admin/verifications/')).data;
    await wait();
    return demoWorkers.filter((worker) => worker.status === 'pending');
  },
  async decideVerification(id, decision) {
    if (!USE_MOCK) return (await api.post(`/admin/verifications/${id}/${decision}/`)).data;
    await wait(400);
    const worker = demoWorkers.find((item) => item.id === id);
    if (worker) worker.status = decision === 'approve' ? 'approved' : 'rejected';
    return worker;
  },
  async users(search = '') {
    if (!USE_MOCK) return (await api.get('/admin/users/', { params: { search } })).data;
    await wait();
    return demoUsers.filter((item) => `${item.name} ${item.email} ${item.role}`.toLowerCase().includes(search.toLowerCase()));
  },
  async jobs() {
    if (!USE_MOCK) return (await api.get('/admin/jobs/')).data;
    await wait();
    return mockJobs;
  }
};