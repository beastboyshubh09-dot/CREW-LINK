import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { demoUsers, demoWorkers } from './mockData';
import { wait } from './client';

const demoAccounts = {
  requester: { id: 'u-101', name: 'Maya Patel', email: 'maya@example.com', role: 'requester', rating: 4.9 },
  customer: { id: 'u-101', name: 'Maya Patel', email: 'maya@example.com', role: 'requester', rating: 4.9 },
  worker: { id: 'u-202', name: 'Arjun Singh', email: 'arjun@example.com', role: 'worker', rating: 4.8, verification: 'approved' },
  admin: { id: 'u-001', name: 'CrewLink Admin', email: 'admin@example.com', role: 'admin' }
};

export const authApi = {
  async getSession() {
    if (isSupabaseConfigured && supabase) {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      const role = profile?.role === 'customer' ? 'requester' : (profile?.role || 'requester');
      return {
        user: {
          id: session.user.id,
          name: profile?.full_name || session.user.user_metadata?.name || 'User',
          email: session.user.email,
          role,
          phone: profile?.phone,
          profilePicture: profile?.profile_picture_url
        },
        access: session.access_token
      };
    }

    const savedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('crewlink_user') : null;
    const savedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('crewlink_access') : null;
    return savedUser && savedToken ? { user: JSON.parse(savedUser), access: savedToken } : null;
  },

  async login(credentials) {
    const { email, password, role: selectedRole } = credentials;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: password || 'TestPass123!'
      });

      if (error) throw new Error(error.message);

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const userRole = profile?.role === 'customer' ? 'requester' : (profile?.role || 'requester');
      const userObj = {
        id: data.user.id,
        name: profile?.full_name || data.user.user_metadata?.full_name || email.split('@')[0],
        email: data.user.email,
        role: userRole,
        phone: profile?.phone
      };

      return {
        user: userObj,
        access: data.session.access_token,
        refresh: data.session.refresh_token
      };
    }

    // Graceful offline fallback
    await wait(400);
    const registeredUser = demoUsers.find((item) => item.email.toLowerCase() === (email || '').toLowerCase());
    const roleKey = selectedRole || (registeredUser ? registeredUser.role : 'requester');
    const baseAccount = demoAccounts[roleKey] || demoAccounts.requester;

    const user = {
      ...baseAccount,
      email: email || baseAccount.email,
      name: registeredUser ? registeredUser.name : baseAccount.name,
      role: roleKey === 'customer' ? 'requester' : roleKey
    };

    return {
      user,
      access: `auth-token-${user.role}-${Date.now()}`,
      refresh: 'refresh-token'
    };
  },

  async register(form) {
    const { email, password, name, role, phone, id_proof, skills } = form;
    const dbRole = role === 'requester' ? 'customer' : role;

    if (isSupabaseConfigured && supabase) {
      let idProofUrl = null;

      // Handle ID proof file upload to Supabase Storage if file exists
      if (id_proof && typeof id_proof !== 'string') {
        const fileExt = id_proof.name ? id_proof.name.split('.').pop() : 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('id-proofs')
          .upload(fileName, id_proof);

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage.from('id-proofs').getPublicUrl(fileName);
          idProofUrl = publicUrlData?.publicUrl || null;
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: password || 'TestPass123!',
        options: {
          data: {
            full_name: name,
            phone: phone || '',
            role: dbRole,
            skills: skills || ['General Labor'],
            id_proof_url: idProofUrl
          }
        }
      });

      if (error) throw new Error(error.message);

      const userRole = role === 'customer' ? 'requester' : role;
      const user = {
        id: data.user?.id || `u-${Date.now()}`,
        name,
        email,
        role: userRole,
        verification: role === 'worker' ? 'pending' : undefined
      };

      return {
        user,
        access: data.session?.access_token || `token-${Date.now()}`,
        refresh: data.session?.refresh_token || 'refresh-token'
      };
    }

    // Graceful offline fallback
    await wait(600);
    const userRole = role === 'customer' ? 'requester' : role;
    const user = {
      id: `u-${Date.now()}`,
      name,
      email,
      role: userRole,
      verification: userRole === 'worker' ? 'pending' : undefined
    };

    demoUsers.unshift({
      id: user.id,
      name: user.name,
      email: user.email,
      role: userRole,
      status: userRole === 'worker' ? 'pending' : 'active',
      joined: new Date().toISOString().slice(0, 10)
    });

    if (userRole === 'worker') {
      demoWorkers.unshift({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: phone || '+91 90000 00000',
        rating: 5.0,
        jobs: 0,
        status: 'pending',
        location: null,
        skills: skills || ['General Labor', 'Home Shifting']
      });
    }

    return {
      user,
      access: `auth-${user.role}-${Date.now()}`,
      refresh: 'refresh-token'
    };
  },

  async logout() {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    if (typeof localStorage !== 'undefined') {
      ['crewlink_user', 'crewlink_access', 'crewlink_refresh'].forEach((key) => localStorage.removeItem(key));
    }
  }
};
