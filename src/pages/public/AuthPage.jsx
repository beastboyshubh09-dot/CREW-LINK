import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: params.get('role') === 'worker' ? 'worker' : 'requester', id_proof: null });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.type === 'file' ? event.target.files[0] : event.target.value });

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (isRegister && form.role === 'worker' && !form.id_proof) return setError('Upload an ID proof to apply as a worker.');
    setBusy(true);
    try {
      const user = isRegister ? await register(form) : await login(form);
      navigate(location.state?.from || `/app/${user.role}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'We could not complete that request. Please try again.');
    } finally { setBusy(false); }
  }

  return <div className="grid min-h-screen bg-white lg:grid-cols-[.9fr_1.1fr]">
    <aside className="relative hidden overflow-hidden bg-forest-900 p-12 text-white lg:flex lg:flex-col lg:justify-between"><Link to="/" className="flex items-center gap-3 font-display text-xl font-extrabold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-forest-700">C</span>CrewLink</Link><div className="relative z-10 max-w-md"><p className="text-xs font-bold tracking-widest text-emerald-300">A BETTER WAY TO GET IT MOVING</p><p className="mt-5 font-display text-4xl font-extrabold leading-tight">Good work starts with a good connection.</p><p className="mt-4 leading-7 text-emerald-100/70">Find trusted local people to lend a hand, or find your next job nearby.</p></div><div className="text-sm text-emerald-100/60">Built for the work that moves us.</div><div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full border border-emerald-300/15"/><div className="absolute -bottom-16 -right-8 h-72 w-72 rounded-full border border-emerald-300/15"/></aside>
    <main className="flex items-center justify-center px-5 py-10"><div className="w-full max-w-md"><Link to="/" className="mb-10 inline-flex items-center gap-2 font-display text-lg font-extrabold lg:hidden"><span className="grid h-9 w-9 place-items-center rounded-lg bg-forest-600 text-white">C</span>CrewLink</Link><p className="text-xs font-bold uppercase tracking-widest text-forest-700">{isRegister ? 'JOIN CREWLINK' : 'WELCOME BACK'}</p><h1 className="mt-2 font-display text-3xl font-extrabold">{isRegister ? 'Create your account' : 'Sign in to CrewLink'}</h1><p className="mt-2 text-sm text-slate-500">{isRegister ? 'Start booking help or finding work nearby.' : 'Pick up where you left off.'}</p>
      <form className="mt-8 space-y-4" onSubmit={submit}>
        {isRegister && <label className="block text-sm font-semibold">Full name<input required name="name" value={form.name} onChange={update} autoComplete="name" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-3 font-normal outline-none transition focus:border-forest-500" placeholder="Your name" /></label>}
        <label className="block text-sm font-semibold">Email address<input required type="email" name="email" value={form.email} onChange={update} autoComplete="email" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-3 font-normal outline-none transition focus:border-forest-500" placeholder="you@example.com" /></label>
        <label className="block text-sm font-semibold">Password<input required type="password" name="password" minLength="6" value={form.password} onChange={update} autoComplete={isRegister ? 'new-password' : 'current-password'} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-3 font-normal outline-none transition focus:border-forest-500" placeholder="At least 6 characters" /></label>
        <fieldset><legend className="mb-2 text-sm font-semibold">{isRegister ? 'I want to' : 'Continue as'}</legend><div className="grid grid-cols-2 gap-2">{['requester', 'worker'].map((role) => <label key={role} className={`cursor-pointer rounded-lg border px-3 py-3 text-sm font-bold capitalize transition ${form.role === role ? 'border-forest-600 bg-forest-50 text-forest-800' : 'border-slate-200 text-slate-600'}`}><input className="sr-only" type="radio" name="role" value={role} checked={form.role === role} onChange={update} />{role === 'worker' ? 'Find work' : 'Book a crew'}</label>)}</div></fieldset>
        {!isRegister && <label className="block text-sm font-semibold">Demo role<select name="role" value={form.role} onChange={update} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 font-normal capitalize"><option value="requester">Requester</option><option value="worker">Worker</option><option value="admin">Admin</option></select></label>}
        {isRegister && form.role === 'worker' && <label className="block text-sm font-semibold">Government ID proof<input required type="file" name="id_proof" accept="image/*,.pdf" onChange={update} className="mt-1.5 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-forest-50 file:px-3 file:py-1.5 file:font-bold file:text-forest-700" /><span className="mt-1 block text-xs font-normal text-slate-500">JPG, PNG, or PDF. Your verification stays private.</span></label>}
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-forest-600 py-3.5 font-bold text-white transition hover:bg-forest-700 disabled:opacity-60">{busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}</button>
      </form><p className="mt-6 text-center text-sm text-slate-500">{isRegister ? 'Already have an account?' : 'New to CrewLink?'} <Link className="font-bold text-forest-700 hover:underline" to={isRegister ? '/login' : '/register'}>{isRegister ? 'Sign in' : 'Create account'}</Link></p>
    </div></main>
  </div>;
}