import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import LocationMap from '../../components/map/LocationMap';
import StatusBadge from '../../components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingRows } from '../../components/ui/ResourceStates';
import { workersApi } from '../../api/workers';
import { useToast } from '../../context/ToastContext';
import { extractCoordinates, formatDistance, isValidCoordinate } from '../../utils/location';

const steps = ['assigned', 'arrived', 'in progress', 'completed'];

export default function ActiveJob() {
  const [status, setStatus] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: job, isLoading, isError, refetch } = useQuery({
    queryKey: ['worker-active-job'],
    queryFn: workersApi.activeJob,
    refetchInterval: 30_000
  });

  useEffect(() => setStatus(job?.status || null), [job?.id, job?.status]);

  const update = useMutation({
    mutationFn: (next) => workersApi.updateJob(job.id, next),
    onSuccess: ({ status: next }) => {
      setStatus(next);
      queryClient.invalidateQueries({ queryKey: ['worker-active-job'] });
      toast(`Job updated: ${next}.`);
    },
    onError: (error) => toast(error.message || 'Could not update job progress.', 'error')
  });

  if (isLoading) return <LoadingRows/>;
  if (isError) return <ErrorState onRetry={refetch}/>;
  if (!job) return <EmptyState title="No active job" detail="When you accept an assignment, its pickup location and route will appear here."/>;

  const currentStatus = status || job.status;
  const statusIndex = steps.indexOf(currentStatus);
  const nextStatus = steps[statusIndex + 1];

  // Normalize pickup/destination coordinates safely
  const jobLocation = job.location && isValidCoordinate(job.location)
    ? { ...extractCoordinates(job.location), address: job.location.address || '' }
    : (job.job_latitude && job.job_longitude)
      ? { lat: Number(job.job_latitude), lng: Number(job.job_longitude), address: job.job_address || '' }
      : null;

  const jobAddress = jobLocation?.address || job.location?.address || job.job_address || 'Job destination';

  // Normalize worker's current position safely
  const workerCoords = extractCoordinates(job.workerLocation);
  const hasRoute = Boolean(workerCoords && jobLocation);

  const openDirections = hasRoute
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${workerCoords.lat}%2C${workerCoords.lng}%3B${jobLocation.lat}%2C${jobLocation.lng}`
    : null;

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-bold uppercase tracking-widest text-forest-700">ON THE JOB</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">{job.type}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {job.id} · {new Date(job.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · {job.duration} hours
          </p>
        </div>
        <StatusBadge status={currentStatus}/>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_350px]">
        <section className="overflow-hidden rounded-xl border border-slate-100 bg-white">
          <div className="p-5">
            <h2 className="font-display text-lg font-extrabold">Route to pickup</h2>
            <p className="mt-1 text-sm text-slate-500">
              {jobAddress}
              {routeInfo
                ? ` · ${routeInfo.approximate ? 'approx. straight-line' : 'road route'} ${formatDistance(routeInfo.distanceKm)}${
                    routeInfo.durationMinutes ? ` · about ${Math.round(routeInfo.durationMinutes)} min` : ''
                  }`
                : ''}
            </p>
          </div>
          <LocationMap
            value={jobLocation}
            valueKind="destination"
            markers={hasRoute ? [{ id: 'you', name: 'Your location', ...workerCoords }] : []}
            route={hasRoute}
            onRouteInfo={setRouteInfo}
            height={380}
          />
          <div className="p-5">
            {openDirections ? (
              <a href={openDirections} target="_blank" rel="noreferrer" className="font-bold text-forest-700 hover:underline">
                Open directions in OpenStreetMap →
              </a>
            ) : (
              <p className="text-sm text-slate-500">A route will be shown when your current location is available.</p>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-100 bg-white p-5">
            <h2 className="font-display font-extrabold">Job details</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{job.description}</p>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-500">Your share</span>
              <strong className="font-display text-xl">₹{Number(job.pay || 0).toLocaleString('en-IN')}</strong>
            </div>
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-5">
            <h2 className="font-display font-extrabold">Update your progress</h2>
            <ol className="my-5 space-y-3">
              {steps.map((step, index) => (
                <li key={step} className="flex items-center gap-3 text-sm">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                      index <= statusIndex ? 'bg-forest-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {index < statusIndex ? '✓' : index + 1}
                  </span>
                  <span className="capitalize">{step === 'arrived' ? 'Arrived at pickup' : step}</span>
                </li>
              ))}
            </ol>
            <button
              disabled={!nextStatus || update.isPending}
              onClick={() => update.mutate(nextStatus)}
              className="w-full rounded-lg bg-forest-600 py-3 text-sm font-bold text-white transition hover:bg-forest-700 disabled:opacity-50"
            >
              {update.isPending
                ? 'Updating…'
                : nextStatus
                  ? nextStatus === 'in progress'
                    ? 'Start job'
                    : nextStatus === 'arrived'
                      ? 'Mark arrived'
                      : 'Mark completed'
                  : 'Job completed'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
