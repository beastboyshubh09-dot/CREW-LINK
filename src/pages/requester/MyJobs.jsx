import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobsApi } from '../../api/jobs';
import StatusBadge from '../../components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingRows } from '../../components/ui/ResourceStates';

const filters = ['all', 'pending', 'matching', 'assigned', 'in progress', 'completed', 'cancelled'];
const dateLabel = (value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function MyJobs() {
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const { data: jobs = [], isLoading, isError, refetch } = useQuery({ queryKey: ['jobs', status, search], queryFn: () => jobsApi.list({ status, search }) });
  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-widest text-forest-700">REQUESTER</p><h1 className="mt-2 font-display text-3xl font-extrabold">My jobs</h1><p className="mt-2 text-sm text-slate-500">Every booking, from first match to final lift.</p></div><Link to="/app/requester/post" className="rounded-lg bg-forest-600 px-4 py-3 text-center text-sm font-bold text-white">＋ Post a job</Link></div>
    <div className="flex flex-col gap-3"><label className="max-w-sm"><span className="sr-only">Search jobs</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs or locations" className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm"/></label><div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter jobs by status">{filters.map((filter) => <button key={filter} onClick={() => setStatus(filter)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold capitalize ${status === filter ? 'bg-forest-700 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:text-forest-700'}`}>{filter}</button>)}</div></div>
    {isLoading ? <LoadingRows/> : isError ? <ErrorState onRetry={refetch}/> : jobs.length ? <div className="space-y-3">{jobs.map((job) => <Link key={job.id} to={`/app/requester/jobs/${job.id}`} className="group grid gap-4 rounded-xl border border-slate-100 bg-white p-5 transition hover:border-forest-200 hover:shadow-lift sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-extrabold">{job.type}</h2><StatusBadge status={job.status}/></div><p className="mt-1 text-sm text-slate-500">{job.id} · {job.location.address}</p><p className="mt-3 text-xs font-medium text-slate-400">{dateLabel(job.date)} · {job.workers} workers · {job.duration} {job.duration === 1 ? 'hour' : 'hours'}</p></div><div className="flex items-center justify-between gap-4 sm:justify-end"><span className="font-display text-lg font-extrabold">₹{job.price.toLocaleString('en-IN')}</span><span className="text-forest-700 group-hover:translate-x-1">→</span></div></Link>)}</div> : <EmptyState title="No jobs match that filter" detail="Try another status or search term, or post a new job." action={<button onClick={() => { setStatus('all'); setSearch(''); }} className="font-bold text-forest-700">Clear filters</button>}/>}</div>;
}