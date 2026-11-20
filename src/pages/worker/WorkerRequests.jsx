import { useQuery } from '@tanstack/react-query';
import { workersApi } from '../../api/workers';
import { RequestCard } from './WorkerOverview';
import { EmptyState, ErrorState, LoadingRows } from '../../components/ui/ResourceStates';

export default function WorkerRequests() {
  const { data = [], isLoading, isError, refetch } = useQuery({ queryKey: ['worker-requests'], queryFn: workersApi.requests });
  return <div><p className="text-xs font-bold uppercase tracking-widest text-forest-700">WORKER</p><h1 className="mt-2 font-display text-3xl font-extrabold">Incoming requests</h1><p className="mt-2 text-sm text-slate-500">A good match is close by. Review the details before the timer runs out.</p><div className="mt-6 grid gap-3 lg:grid-cols-2">{isLoading ? <LoadingRows/> : isError ? <ErrorState onRetry={refetch}/> : data.length ? data.map((request) => <RequestCard key={request.id} request={request}/>) : <div className="lg:col-span-2"><EmptyState title="No requests at the moment" detail="Stay online and we’ll send work that fits your location."/></div>}</div></div>;
}