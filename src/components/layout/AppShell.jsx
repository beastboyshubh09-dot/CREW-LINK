import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { registerPushToken } from '../../utils/pushNotifications';
import { USE_MOCK } from '../../api/client';
import useLiveEvents from '../../hooks/useLiveEvents';

const navigation = {
  requester: [['Overview', '/app/requester'], ['My jobs', '/app/requester/jobs'], ['Post a job', '/app/requester/post']],
  worker: [['Overview', '/app/worker'], ['Requests', '/app/worker/requests'], ['Active job', '/app/worker/active'], ['Earnings', '/app/worker/earnings'], ['Profile', '/app/worker/profile']],
  admin: [['Overview', '/app/admin'], ['Verifications', '/app/admin/verifications'], ['People', '/app/admin/people'], ['Jobs', '/app/admin/jobs']]
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('crewlink_theme') === 'dark');
  const navigate = useNavigate();
  const toast = useToast();
  const { status: liveStatus } = useLiveEvents();
  const links = navigation[user?.role] || [];
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('crewlink_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  async function enableAlerts() {
    try {
      const token = await registerPushToken();
      toast(token ? 'Push notifications enabled on this device.' : 'Push notifications need Firebase configuration and browser permission.', token ? 'success' : 'error');
    } catch { toast('Could not enable push notifications on this device.', 'error'); }
  }
  async function signOut() {
    const { locationStopError } = await logout();
    if (locationStopError) toast('Signed out, but the server could not confirm location sharing stopped. Your last position should expire under the server freshness policy.', 'error');
    navigate('/');
  }
  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden border-r border-emerald-950/10 bg-white px-5 py-7 lg:flex lg:flex-col">
        <NavLink to="/" className="flex items-center gap-3 font-display text-xl font-extrabold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-forest-600 text-lg text-white">C</span>CrewLink</NavLink>
        <p className="mb-3 mt-10 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">Workspace</p>
        <nav className="space-y-1" aria-label="Main navigation">{links.map(([label, path]) => <NavLink key={path} to={path} end={path.split('/').length === 3} className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'bg-forest-50 text-forest-700' : 'text-slate-600 hover:bg-slate-50'}`}>{label}</NavLink>)}</nav>
        <div className="mt-auto border-t border-slate-100 pt-4"><div className="px-3"><p className="font-bold">{user?.name}</p><p className="mt-0.5 text-xs capitalize text-slate-500">{user?.role} account</p></div><button onClick={signOut} className="mt-4 w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50">Sign out</button></div>
      </aside>
      <div className="min-w-0 pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-emerald-950/10 bg-white/95 px-5 backdrop-blur lg:px-9">
          <div className="flex items-center gap-3 lg:hidden"><span className="grid h-9 w-9 place-items-center rounded-xl bg-forest-600 font-display font-extrabold text-white">C</span><span className="font-display font-extrabold">CrewLink</span></div>
          <div className="hidden text-sm font-medium text-slate-500 lg:block">Good to see you, <span className="font-bold text-ink">{user?.name?.split(' ')[0]}</span></div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3"><span className={`h-2 w-2 rounded-full ${liveStatus === 'connected' || USE_MOCK ? 'bg-emerald-500' : 'bg-amber-400'}`}/><span className="hidden text-xs font-semibold text-slate-500 sm:block">{USE_MOCK ? 'Demo mode' : liveStatus === 'connected' ? 'Live updates' : 'Connecting updates'}</span><button onClick={() => setDarkMode((current) => !current)} aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`} title={`Switch to ${darkMode ? 'light' : 'dark'} mode`} className="rounded-lg px-2 py-1 text-xs font-bold text-forest-700 hover:bg-forest-50">{darkMode ? 'Light' : 'Dark'}</button><button onClick={enableAlerts} title="Enable push alerts" aria-label="Enable push alerts" className="rounded-lg px-2 py-1 text-xs font-bold text-forest-700 hover:bg-forest-50">Alerts</button><div className="grid h-9 w-9 place-items-center rounded-full bg-forest-100 text-sm font-bold text-forest-700">{user?.name?.[0]}</div></div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-7 lg:px-10 lg:py-9"><Outlet /></main>
        <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-emerald-950/10 bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" style={{ gridTemplateColumns: `repeat(${Math.min(links.length, 5)}, minmax(0, 1fr))` }} aria-label="Mobile navigation">
          {links.slice(0, 5).map(([label, path], index) => <NavLink key={path} to={path} end={path.split('/').length === 3} className={({ isActive }) => `flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${isActive ? 'text-forest-700' : 'text-slate-400'}`}><span className="text-base" aria-hidden="true">{['⌂', '▤', '＋', '◉', '●'][index]}</span>{label}</NavLink>)}
        </nav>
      </div>
    </div>
  );
}