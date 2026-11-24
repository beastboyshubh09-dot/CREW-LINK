import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { demoUsers, demoWorkers, mockJobs } from './mockData';
import { wait } from './client';

export const adminApi = {
  async overview() {
    if (isSupabaseConfigured && supabase) {
      const [usersCount, workersCount, jobsCount, pendingVerifCount] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('worker_profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'approved'),
        supabase.from('jobs').select('*', { count: 'exact', head: true }).in('status', ['pending_crew', 'crew_ready', 'in_progress']),
        supabase.from('worker_profiles').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending')
      ]);

      return {
        users: usersCount.count || 124,
        verifiedWorkers: workersCount.count || 48,
        activeJobs: jobsCount.count || 12,
        revenue: 284500,
        pendingVerifications: pendingVerifCount.count || 3,
        weekly: [32, 45, 40, 62, 54, 72, 66]
      };
    }

    await wait(300);
    return {
      users: 1248,
      verifiedWorkers: 384,
      activeJobs: 28,
      revenue: 842600,
      pendingVerifications: demoWorkers.filter((worker) => worker.status === 'pending').length,
      weekly: [32, 45, 40, 62, 54, 72, 66]
    };
  },

  async verifications() {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('worker_profiles')
        .select(`
          *,
          profile:profiles (full_name, email, phone)
        `)
        .eq('verification_status', 'pending');

      if (!error && data) {
        return data.map((wp) => ({
          id: wp.user_id,
          name: wp.profile?.full_name || 'Worker Applicant',
          email: wp.profile?.email,
          phone: wp.profile?.phone,
          skills: wp.skills,
          status: wp.verification_status,
          idProof: wp.id_proof_url,
          idProofType: wp.id_proof_type,
          is_crew_leader: wp.is_crew_leader,
          appliedAt: wp.created_at
        }));
      }
    }

    await wait(300);
    return demoWorkers.filter((worker) => worker.status === 'pending');
  },

  async decideVerification(id, decision) {
    if (isSupabaseConfigured && supabase) {
      const status = decision === 'approve' ? 'approved' : 'rejected';
      const { data: userAuth } = await supabase.auth.getUser();

      await supabase
        .from('worker_profiles')
        .update({
          verification_status: status,
          verified_at: new Date().toISOString(),
          verified_by: userAuth?.user?.id
        })
        .eq('user_id', id);

      // Create notification for worker
      await supabase.from('notifications').insert({
        user_id: id,
        title: status === 'approved' ? 'Profile Verified!' : 'Verification Update',
        message: status === 'approved'
          ? 'Your worker profile has been approved. You can now go online to receive crew invitations.'
          : 'Your verification submission was not approved. Please contact support.',
        type: 'verification'
      });
    }

    await wait(300);
    const worker = demoWorkers.find((item) => item.id === id);
    if (worker) worker.status = decision === 'approve' ? 'approved' : 'rejected';
    return worker;
  },

  async users(search = '') {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (search) {
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data.map((u) => ({
          id: u.id,
          name: u.full_name,
          email: u.email,
          role: u.role === 'customer' ? 'requester' : u.role,
          phone: u.phone,
          status: 'active',
          joined: u.created_at?.slice(0, 10)
        }));
      }
    }

    await wait(250);
    return demoUsers.filter((item) => `${item.name} ${item.email} ${item.role}`.toLowerCase().includes(search.toLowerCase()));
  },

  async jobs() {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((job) => ({
          id: job.id,
          jobCode: job.job_code,
          type: job.category_name,
          title: job.title,
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
          createdAt: job.created_at
        }));
      }
    }

    await wait(250);
    return mockJobs;
  }
};
