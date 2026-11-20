import { createContext, useContext, useEffect, useReducer } from 'react';
import { authApi } from '../api/auth';
import { workersApi } from '../api/workers';

const AuthContext = createContext(null);
const initialState = { user: null, accessToken: null, loading: true };

function reducer(state, action) {
  switch (action.type) {
    case 'RESTORE': return { ...state, ...action.payload, loading: false };
    case 'LOGIN': return { user: action.payload.user, accessToken: action.payload.access, loading: false };
    case 'LOGOUT': return { user: null, accessToken: null, loading: false };
    default: return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const user = localStorage.getItem('crewlink_user');
    const access = localStorage.getItem('crewlink_access');
    dispatch({ type: 'RESTORE', payload: user && access ? { user: JSON.parse(user), accessToken: access } : {} });
    const expireSession = () => dispatch({ type: 'LOGOUT' });
    window.addEventListener('crewlink:session-expired', expireSession);
    return () => window.removeEventListener('crewlink:session-expired', expireSession);
  }, []);

  const login = async (credentials) => {
    const result = await authApi.login(credentials);
    localStorage.setItem('crewlink_user', JSON.stringify(result.user));
    localStorage.setItem('crewlink_access', result.access);
    if (result.refresh) localStorage.setItem('crewlink_refresh', result.refresh);
    dispatch({ type: 'LOGIN', payload: result });
    return result.user;
  };

  const register = async (form) => {
    const result = await authApi.register(form);
    localStorage.setItem('crewlink_user', JSON.stringify(result.user));
    localStorage.setItem('crewlink_access', result.access);
    if (result.refresh) localStorage.setItem('crewlink_refresh', result.refresh);
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
    ['crewlink_user', 'crewlink_access', 'crewlink_refresh'].forEach((key) => localStorage.removeItem(key));
    dispatch({ type: 'LOGOUT' });
    return { locationStopError };
  };

  return <AuthContext.Provider value={{ ...state, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}