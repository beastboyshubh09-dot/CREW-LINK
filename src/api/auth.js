import { api, USE_MOCK, wait } from './client';
import { demoUsers, demoWorkers } from './mockData';

const demoAccounts = {
  requester: { id: 'u-101', name: 'Maya Patel', email: 'maya@example.com', role: 'requester', rating: 4.9 },
  worker: { id: 'u-202', name: 'Arjun Singh', email: 'arjun@example.com', role: 'worker', rating: 4.8, verification: 'approved' },
  admin: { id: 'u-001', name: 'CrewLink Admin', email: 'admin@example.com', role: 'admin' }
};

export const authApi = {
  async login(credentials) {
    if (!USE_MOCK) {
      const { email, password } = credentials;
      return (await api.post('/auth/login/', { email, password })).data;
    }
    await wait();
    const registeredUser = demoUsers.find((item) => item.email === credentials.email);
    const user = registeredUser ? { ...registeredUser, verification: registeredUser.role === 'worker' ? demoWorkers.find((worker) => worker.id === registeredUser.id)?.status : undefined } : demoAccounts[credentials.role || 'requester'];
    return { user: { ...user, email: credentials.email || user.email }, access: `demo-${user.role}-${Date.now()}`, refresh: 'demo-refresh' };
  },
  async register(form) {
    if (!USE_MOCK) {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => value && body.append(key, value));
      return (await api.post('/auth/register/', body)).data;
    }
    await wait(650);
    const user = { id: `u-${Date.now()}`, name: form.name, email: form.email, role: form.role, verification: form.role === 'worker' ? 'pending' : undefined };
    demoUsers.unshift({ id: user.id, name: user.name, email: user.email, role: user.role, status: user.role === 'worker' ? 'pending' : 'active', joined: new Date().toISOString().slice(0, 10) });
    if (user.role === 'worker') {
      demoWorkers.unshift({ id: user.id, name: user.name, email: user.email, phone: '', rating: 0, jobs: 0, status: 'pending', location: null, idProof: URL.createObjectURL(form.id_proof), idProofType: form.id_proof.type });
    }
    return { user, access: `demo-${user.role}-${Date.now()}`, refresh: 'demo-refresh' };
  }
};