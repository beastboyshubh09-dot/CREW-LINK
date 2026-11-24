import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const WORKER_SKILL_OPTIONS = [
  'Home Shifting',
  'Loading Help',
  'Furniture Shifting',
  'Warehouse Loading',
  'General Manual Work',
  'Construction Clean-up'
];

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: params.get('role') === 'worker' ? 'worker' : 'requester',
    skills: ['Home Shifting', 'Loading Help'],
    is_crew_leader: false,
    id_proof: null
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const update = (event) => {
    const { name, value, type, checked, files } = event.target;
    if (type === 'file') {
      setForm({ ...form, [name]: files[0] });
    } else if (type === 'checkbox') {
      setForm({ ...form, [name]: checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const toggleSkill = (skill) => {
    const exists = form.skills.includes(skill);
    const updated = exists ? form.skills.filter((s) => s !== skill) : [...form.skills, skill];
    setForm({ ...form, skills: updated });
  };

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (isRegister && form.role === 'worker' && form.skills.length === 0) {
      return setError('Please select at least one skill or capability.');
    }
    setBusy(true);
    try {
      const user = isRegister ? await register(form) : await login(form);
      const targetRole = user.role === 'customer' ? 'requester' : user.role;
      navigate(location.state?.from || `/app/${targetRole}`, { replace: true });
    } catch (requestError) {
      setError(requestError.message || requestError.response?.data?.detail || 'Authentication failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[.9fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-forest-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-3 font-display text-xl font-extrabold">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-forest-700">C</span>
          CrewLink
        </Link>
        <div className="relative z-10 max-w-md">
          <p className="text-xs font-bold tracking-widest text-emerald-300">ONE TICKET. ONE CREW. MULTIPLE WORKERS.</p>
          <p className="mt-5 font-display text-4xl font-extrabold leading-tight">
            Assembling coordinated workforces near you.
          </p>
          <p className="mt-4 leading-7 text-emerald-100/70">
            Book verified helpers for home shifting, loading, and manual tasks. Or join as a worker or crew leader.
          </p>
        </div>
        <div className="text-sm text-emerald-100/60">Built for reliable, high-trust on-demand workforce.</div>
        <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full border border-emerald-300/15" />
        <div className="absolute -bottom-16 -right-8 h-72 w-72 rounded-full border border-emerald-300/15" />
      </aside>

      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 font-display text-lg font-extrabold lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-forest-600 text-white">C</span>
            CrewLink
          </Link>
          <p className="text-xs font-bold uppercase tracking-widest text-forest-700">
            {isRegister ? 'JOIN CREWLINK' : 'WELCOME BACK'}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">
            {isRegister ? 'Create your account' : 'Sign in to CrewLink'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {isRegister ? 'Start booking help or finding work nearby.' : 'Sign in to your account to continue.'}
          </p>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            {isRegister && (
              <label className="block text-sm font-semibold">
                Full name
                <input
                  required
                  name="name"
                  value={form.name}
                  onChange={update}
                  autoComplete="name"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-3 font-normal outline-none transition focus:border-forest-500"
                  placeholder="e.g. Arjun Sharma"
                />
              </label>
            )}

            <label className="block text-sm font-semibold">
              Email address
              <input
                required
                type="email"
                name="email"
                value={form.email}
                onChange={update}
                autoComplete="email"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-3 font-normal outline-none transition focus:border-forest-500"
                placeholder="you@example.com"
              />
            </label>

            {isRegister && (
              <label className="block text-sm font-semibold">
                Phone number
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={update}
                  autoComplete="tel"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-3 font-normal outline-none transition focus:border-forest-500"
                  placeholder="+91 98765 43210"
                />
              </label>
            )}

            <label className="block text-sm font-semibold">
              Password
              <input
                required
                type="password"
                name="password"
                minLength="6"
                value={form.password}
                onChange={update}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3.5 py-3 font-normal outline-none transition focus:border-forest-500"
                placeholder="At least 6 characters"
              />
            </label>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold">{isRegister ? 'I want to' : 'Sign in as'}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'requester', label: isRegister ? 'Book a crew' : 'Customer' },
                  { id: 'worker', label: isRegister ? 'Find work' : 'Worker' }
                ].map(({ id, label }) => (
                  <label
                    key={id}
                    className={`cursor-pointer rounded-lg border px-3 py-3 text-center text-sm font-bold capitalize transition ${
                      form.role === id
                        ? 'border-forest-600 bg-forest-50 text-forest-800'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="role"
                      value={id}
                      checked={form.role === id}
                      onChange={update}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            {!isRegister && (
              <label className="block text-sm font-semibold">
                Role Selector
                <select
                  name="role"
                  value={form.role}
                  onChange={update}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-3 font-normal capitalize"
                >
                  <option value="requester">Customer / Requester</option>
                  <option value="worker">Worker</option>
                  <option value="admin">Platform Administrator</option>
                </select>
              </label>
            )}

            {isRegister && form.role === 'worker' && (
              <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                <div>
                  <span className="block text-sm font-semibold text-slate-900">Work Categories & Skills</span>
                  <p className="text-xs text-slate-500 mb-2">Select the types of tasks you are available for:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {WORKER_SKILL_OPTIONS.map((skill) => {
                      const active = form.skills.includes(skill);
                      return (
                        <button
                          type="button"
                          key={skill}
                          onClick={() => toggleSkill(skill)}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                            active
                              ? 'bg-forest-600 text-white'
                              : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {skill} {active ? '✓' : '+'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    name="is_crew_leader"
                    checked={form.is_crew_leader}
                    onChange={update}
                    className="h-4 w-4 rounded border-slate-300 text-forest-600 focus:ring-forest-500"
                  />
                  I represent an existing group / crew (Crew Leader)
                </label>

                <label className="block text-sm font-semibold">
                  Verification Document (ID Proof)
                  <input
                    type="file"
                    name="id_proof"
                    accept="image/*,.pdf"
                    onChange={update}
                    className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-forest-50 file:px-3 file:py-1.5 file:font-bold file:text-forest-700"
                  />
                  <span className="mt-1 block text-xs text-slate-500">Aadhaar, Voter ID, or Driving License. Kept private.</span>
                </label>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700">
                {error}
              </p>
            )}

            <button
              disabled={busy}
              type="submit"
              className="w-full rounded-lg bg-forest-600 py-3.5 font-bold text-white transition hover:bg-forest-700 disabled:opacity-60"
            >
              {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {isRegister ? 'Already have an account?' : 'New to CrewLink?'}{' '}
            <Link className="font-bold text-forest-700 hover:underline" to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Sign in' : 'Create account'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
