import { useQuery } from '@tanstack/react-query';
import { workersApi } from '../../api/workers';
import StatusBadge from '../../components/ui/StatusBadge';
import { ErrorState, LoadingRows } from '../../components/ui/ResourceStates';

export default function WorkerProfile() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['worker-profile'], queryFn: workersApi.profile });
  if (isLoading) return <LoadingRows/>;
  if (isError) return <ErrorState onRetry={refetch}/>;
  return <div className="max-w-3xl"><p className="text-xs font-bold uppercase tracking-widest text-forest-700">WORKER</p><h1 className="mt-2 font-display text-3xl font-extrabold">Your profile</h1><section className="mt-6 rounded-xl border border-slate-100 bg-white p-6"><div className="flex flex-wrap items-center gap-4"><div className="grid h-16 w-16 place-items-center rounded-full bg-forest-100 font-display text-2xl font-extrabold text-forest-700">{data.name[0]}</div><div className="flex-1"><h2 className="font-display text-xl font-extrabold">{data.name}</h2><p className="mt-1 text-sm text-slate-500">{data.email} · {data.phone}</p></div><StatusBadge status={data.status}/></div><div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3"><div><p className="text-xs font-bold text-slate-400">RATING</p><p className="mt-1 font-bold">★ {data.rating} / 5</p></div><div><p className="text-xs font-bold text-slate-400">COMPLETED JOBS</p><p className="mt-1 font-bold">{data.jobs}</p></div><div><p className="text-xs font-bold text-slate-400">VERIFICATION</p><p className="mt-1 capitalize font-bold">{data.status}</p></div></div><div className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">Your ID verification is approved. Requesters can see your verified status when you’re assigned to a job.</div></section></div>;
}