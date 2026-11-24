import { createContext, useContext, useEffect, useReducer } from 'react';
import { authApi } from '../api/auth';
import { workersApi } from '../api/workers';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);
const initialState = { user: null, accessToken: null, loading: true };

function reducer(state, action) {
  switch (action.type) {
    case 'RESTORE':
      return { ...state, ...action.payload, loading: false };
    case 'LOGIN':
      return { user: action.payload.user, accessToken: action.payload.access, loading: false };
    case 'LOGOUT':
      return { user: null, accessToken: null, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const session = await authApi.getSession();
        if (mounted && session?.user) {
          dispatch({ type: 'RESTORE', payload: { user: session.user, accessToken: session.access } });
        } else if (mounted) {
          dispatch({ type: 'RESTORE', payload: {} });
        }
      } catch (err) {
        if (mounted) dispatch({ type: 'RESTORE', payload: {} });
      }
    }

    initSession();

    // Supabase auth state change listener
    let authSubscription = null;
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const role = profile?.role === 'customer' ? 'requester' : (profile?.role || 'requester');
          const userObj = {
            id: session.user.id,
            name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            email: session.user.email,
            role,
            phone: profile?.phone
          };

          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('crewlink_user', JSON.stringify(userObj));
            localStorage.setItem('crewlink_access', session.access_token);
          }
          dispatch({ type: 'LOGIN', payload: { user: userObj, access: session.access_token } });
        } else if (event === 'SIGNED_OUT') {
          if (typeof localStorage !== 'undefined') {
            ['crewlink_user', 'crewlink_access', 'crewlink_refresh'].forEach((key) => localStorage.removeItem(key));
          }
          dispatch({ type: 'LOGOUT' });
        }
      });
      authSubscription = subscription;
    }

    const expireSession = () => dispatch({ type: 'LOGOUT' });
    window.addEventListener('crewlink:session-expired', expireSession);

    return () => {
      mounted = false;
      if (authSubscription) authSubscription.unsubscribe();
      window.removeEventListener('crewlink:session-expired', expireSession);
    };
  }, []);

  const login = async (credentials) => {
    const result = await authApi.login(credentials);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('crewlink_user', JSON.stringify(result.user));
      localStorage.setItem('crewlink_access', result.access);
      if (result.refresh) localStorage.setItem('crewlink_refresh', result.refresh);
    }
    dispatch({ type: 'LOGIN', payload: result });
    return result.user;
  };

  const register = async (form) => {
    const result = await authApi.register(form);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('crewlink_user', JSON.stringify(result.user));
      localStorage.setItem('crewlink_access', result.access);
      if (result.refresh) localStorage.setItem('crewlink_refresh', result.refresh);
    }
    dispatch({ type: 'LOGIN', payload: result });
    return result.user;
  };

  const logout = async () => {
    let locationStopError = null;
    if (state.user?.role === 'worker') {
      try {
        await workersApi.setAvailability(false);
      } catch (error) {
        locationStopError = error;
      }
    }
    await authApi.logout();
    dispatch({ type: 'LOGOUT' });
    return { locationStopError };
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
