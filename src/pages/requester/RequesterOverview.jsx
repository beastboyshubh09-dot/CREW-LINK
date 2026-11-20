import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '../../api/jobs';
import StatusBadge from '../../components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingRows } from '../../components/ui/ResourceStates';

const money = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

export default function RequesterOverview() {
  const { data: jobs = [], isLoading, isError, refetch } = useQuery({ queryKey: ['jobs'], queryFn: () => jobsApi.list() });
  const active = jobs.filter((job) => !['completed', 'cancelled'].includes(job.status));
  return <div className="space-y-8">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-widest text-forest-700">REQUESTER OVERVIEW</p><h1 className="mt-2 font-display text-3xl font-extrabold">Make your next move easier.</h1><p className="mt-2 text-sm text-slate-500">Your local crews and jobs, all in one place.</p></div><Link to="/app/requester/post" className="inline-flex items-center justify-center gap-2 rounded-lg bg-forest-600 px-5 py-3 text-sm font-bold text-white hover:bg-forest-700"><span aria-hidden="true">＋</span> Post a job</Link></div>
    <section className="grid gap-3 sm:grid-cols-3"><Metric label="Active jobs" value={active.length} caption="Crew activity right now"/><Metric label="Completed jobs" value={jobs.filter((job) => job.status === 'completed').length} caption="Jobs handled so far"/><Metric label="Total booked" value={money(jobs.reduce((sum, job) => sum + job.price, 0))} caption="Across all your jobs"/></section>
    <section><div className="mb-4 flex items-center justify-between"><div><h2 className="font-display text-xl font-extrabold">Recent jobs</h2><p className="mt-1 text-sm text-slate-500">Follow the crew from match to wrap-up.</p></div><Link to="/app/requester/jobs" className="text-sm font-bold text-forest-700 hover:underline">View all →</Link></div>{isLoading ? <LoadingRows/> : isError ? <ErrorState onRetry={refetch}/> : jobs.length ? <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">{jobs.slice(0, 3).map((job) => <Link key={job.id} to={`/app/requester/jobs/${job.id}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 hover:bg-slate-50"><div className="min-w-0"><p className="truncate font-bold">{job.type}<span className="ml-2 text-xs font-medium text-slate-400">{job.id}</span></p><p className="mt-1 truncate text-sm text-slate-500">{job.location.address} · {job.workers} workers</p></div><div className="flex items-center gap-4"><StatusBadge status={job.status}/><span className="w-20 text-right text-sm font-bold">{money(job.price)}</span></div></Link>)}</div> : <EmptyState title="No jobs yet" detail="Post a job to find verified hands nearby." action={<Link className="font-bold text-forest-700" to="/app/requester/post">Book a crew →</Link>}/>}</section>
  </div>;
}

function Metric({ label, value, caption }) { return <article className="rounded-xl border border-slate-100 bg-white p-5"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 font-display text-3xl font-extrabold">{value}</p><p className="mt-1 text-xs text-slate-400">{caption}</p></article>; }