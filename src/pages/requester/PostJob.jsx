import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '../../api/jobs';
import { workersApi } from '../../api/workers';
import LocationMap from '../../components/map/LocationMap';
import { useToast } from '../../context/ToastContext';
import { formatDistance, isValidCoordinate } from '../../utils/location';

const initialLocation = { lat: null, lng: null, address: '' };
const today = new Date().toISOString().slice(0, 16);
const searchRadii = [2, 5, 10, 25];

export default function PostJob() {
  const [form, setForm] = useState({ type: 'Home shifting', description: '', workers: 2, duration: 2, date: '', location: initialLocation });
  const [radiusKm, setRadiusKm] = useState(5);
  const [selectedIds, setSelectedIds] = useState([]);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const hasLocation = isValidCoordinate(form.location);
  const locationKey = `${form.location.lat ?? ''}:${form.location.lng ?? ''}:${radiusKm}:${form.type}`;

  const workersQuery = useQuery({
    queryKey: ['nearby-workers', locationKey],
    queryFn: () => workersApi.nearby(form.location, radiusKm, [form.type]),
    enabled: hasLocation,
    staleTime: 30_000,
    refetchInterval: 30_000
  });

  useEffect(() => setSelectedIds([]), [locationKey]);

  const matchingWorkers = useMemo(() => {
    return (workersQuery.data || []).filter((worker) => {
      if (!worker?.last_location_update) return true;
      const updatedAt = new Date(worker.last_location_update).getTime();
      return !Number.isFinite(updatedAt) || Date.now() - updatedAt <= 5 * 60_000;
    });
  }, [workersQuery.data]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => matchingWorkers.some((worker) => worker.id === id)).slice(0, Number(form.workers)));
  }, [matchingWorkers, form.workers]);

  const selectedWorkers = matchingWorkers.filter((worker) => selectedIds.includes(worker.id));
  const mapMarkers = useMemo(() => [
    ...selectedWorkers.map((worker) => ({ ...worker.location, id: worker.id, name: worker.name, distanceKm: worker.distance_km, selected: true })),
    ...matchingWorkers.filter((worker) => !selectedIds.includes(worker.id)).map((worker) => ({ ...worker.location, id: worker.id, name: worker.name, distanceKm: worker.distance_km }))
  ], [selectedWorkers, matchingWorkers, selectedIds]);

  const mutation = useMutation({
    mutationFn: jobsApi.create,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast('Your job is posted. Finding your nearest crew now.');
      navigate(`/app/requester/jobs/${job.id}`);
    },
    onError: () => toast('Could not post your job. Please retry.', 'error')
  });

  const estimate = Number(form.workers) * Number(form.duration) * 300;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  function toggleWorker(workerId) {
    setSelectedIds((current) => current.includes(workerId)
      ? current.filter((id) => id !== workerId)
      : current.length < Number(form.workers) ? [...current, workerId] : current);
  }

  function submit(event) {
    event.preventDefault();
    const next = {};
    if (form.description.trim().length < 10) next.description = 'Add a few details so your crew knows what to expect.';
    if (!form.date || new Date(form.date) < new Date()) next.date = 'Choose a future date and time.';
    if (!form.location.address || !isValidCoordinate(form.location)) next.location = 'Search for an address or pin the pickup on the map.';
    setErrors(next);
    if (Object.keys(next).length) return;

    mutation.mutate({
      ...form,
      workers: Number(form.workers),
      duration: Number(form.duration),
      date: new Date(form.date).toISOString(),
      job_latitude: Number(form.location.lat),
      job_longitude: Number(form.location.lng),
      job_address: form.location.address,
      pincode: form.location.pincode || '',
      city: form.location.city || '',
      state: form.location.state || '',
      search_radius_km: radiusKm,
      worker_ids: selectedIds
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/app/requester" className="text-sm font-bold text-forest-700">← Back to overview</Link>
      <div className="mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-forest-700">NEW BOOKING</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold">Bring in a helping hand.</h1>
        <p className="mt-2 text-sm text-slate-500">Tell us what you need and we’ll match nearby verified workers.</p>
      </div>

      <form onSubmit={submit} className="mt-7 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-100 bg-white p-5 sm:p-6">
            <h2 className="font-display text-lg font-extrabold">Job details</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Type of job
                <select
                  value={form.type}
                  onChange={(event) => update('type', event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 focus:border-forest-600 focus:outline-none"
                >
                  <option>Home shifting</option>
                  <option>Loading help</option>
                  <option>Furniture shifting</option>
                  <option>Warehouse loading</option>
                  <option>Other manual work</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-semibold">
                  Workers
                  <div className="mt-1.5 flex h-[46px] items-center justify-between rounded-lg border border-slate-200">
                    <button
                      type="button"
                      aria-label="Remove one worker"
                      onClick={() => update('workers', Math.max(1, Number(form.workers) - 1))}
                      className="h-full w-10 text-lg text-slate-500 hover:text-slate-700"
                    >
                      −
                    </button>
                    <span className="font-bold">{form.workers}</span>
                    <button
                      type="button"
                      aria-label="Add one worker"
                      onClick={() => update('workers', Math.min(20, Number(form.workers) + 1))}
                      className="h-full w-10 text-lg text-forest-700 hover:text-forest-800"
                    >
                      ＋
                    </button>
                  </div>
                </label>
                <label className="block text-sm font-semibold">
                  Hours
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={form.duration}
                    onChange={(event) => update('duration', event.target.value)}
                    className="mt-1.5 h-[46px] w-full rounded-lg border border-slate-200 px-3 focus:border-forest-600 focus:outline-none"
                  />
                </label>
              </div>
              <label className="block text-sm font-semibold sm:col-span-2">
                What needs doing?
                <textarea
                  value={form.description}
                  onChange={(event) => update('description', event.target.value)}
                  rows="3"
                  placeholder="For example: carry 12 boxes and a sofa down from the second floor…"
                  className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-3 font-normal focus:border-forest-600 focus:outline-none"
                />
                {errors.description && <span className="mt-1 block text-xs text-rose-700">{errors.description}</span>}
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-5 sm:p-6">
            <h2 className="font-display text-lg font-extrabold">When and where</h2>
            <label className="mt-4 block text-sm font-semibold">
              Date and start time
              <input
                required
                type="datetime-local"
                min={today}
                value={form.date}
                onChange={(event) => update('date', event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-3 sm:max-w-sm focus:border-forest-600 focus:outline-none"
              />
              {errors.date && <span className="mt-1 block text-xs text-rose-700">{errors.date}</span>}
            </label>
            <div className="mt-5">
              <p className="mb-2 text-sm font-semibold">Pickup location</p>
              <LocationMap
                value={hasLocation ? form.location : null}
                onChange={(location) => update('location', location)}
                selectable
                height={280}
              />
              {errors.location && <p className="mt-2 text-xs text-rose-700">{errors.location}</p>}
              <p className="mt-2 text-xs text-slate-400">
                Allow GPS or search an Indian area, city or PIN code; adjust the pin by clicking the map.
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-extrabold">Nearby available workers</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose up to {form.workers}; workers must be available and sharing their location.
                </p>
              </div>
              <label className="text-sm font-semibold">
                Search radius
                <select
                  value={radiusKm}
                  onChange={(event) => setRadiusKm(Number(event.target.value))}
                  className="ml-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus:border-forest-600 focus:outline-none"
                >
                  {searchRadii.map((radius) => (
                    <option key={radius} value={radius}>{radius} km</option>
                  ))}
                </select>
              </label>
            </div>

            {!hasLocation ? (
              <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                Choose your job location above to find workers nearby.
              </p>
            ) : workersQuery.isLoading ? (
              <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                Searching within {radiusKm} km…
              </p>
            ) : workersQuery.isError ? (
              <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-4 text-sm text-rose-800">
                Could not load nearby workers. You can still post the job and try again.
              </p>
            ) : matchingWorkers.length ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {matchingWorkers.map((worker) => {
                  const selected = selectedIds.includes(worker.id);
                  return (
                    <article
                      key={worker.id}
                      className={`rounded-lg border p-4 transition ${
                        selected ? 'border-forest-500 bg-forest-50' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          {worker.profile_picture ? (
                            <img src={worker.profile_picture} alt="" className="h-10 w-10 rounded-full object-cover"/>
                          ) : (
                            <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest-100 font-bold text-forest-700">
                              {worker.name?.[0] || '?'}
                            </span>
                          )}
                          <div className="min-w-0">
                            <h3 className="truncate font-bold">{worker.name}</h3>
                            <p className="mt-1 text-xs text-amber-700">
                              ★ {Number(worker.rating || 0).toFixed(1)}
                              <span className="ml-1 text-slate-400">· {worker.jobs || 0} jobs</span>
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          {formatDistance(worker.distance_km)}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-slate-500">
                        {(worker.skills || []).join(' · ') || form.type}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-medium text-emerald-700">Available · location shared</span>
                        <button
                          type="button"
                          onClick={() => toggleWorker(worker.id)}
                          disabled={!selected && selectedIds.length >= Number(form.workers)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-40 ${
                            selected
                              ? 'border border-forest-200 text-forest-700 hover:bg-forest-100'
                              : 'bg-forest-600 text-white hover:bg-forest-700'
                          }`}
                        >
                          {selected ? 'Selected' : 'Select worker'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                No available workers found within {radiusKm} km. Increase the search radius or post the job for automatic matching.
              </p>
            )}

            {matchingWorkers.length > 0 && (
              <p className="mt-3 text-xs text-slate-400">
                {selectedIds.length} of {form.workers} workers selected. Unselected positions can still be matched after posting.
              </p>
            )}

            {mapMarkers.length > 0 && (
              <div className="mt-4">
                <LocationMap
                  value={hasLocation ? form.location : null}
                  markers={mapMarkers}
                  route={selectedWorkers.length > 0}
                  height={260}
                />
              </div>
            )}

            {import.meta.env.VITE_USE_MOCK !== 'false' && (
              <p className="mt-3 text-xs text-amber-700">
                Demo mode: worker profiles and availability are sample data, not live CrewLink workers.
              </p>
            )}
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-slate-100 bg-white p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-extrabold">Price estimate</h2>
          <p className="mt-1 text-sm text-slate-500">Based on crew size and time.</p>
          <div className="mt-5 space-y-3 border-b border-slate-100 pb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">{form.workers} workers</span>
              <span>× {form.duration} hours</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Estimated rate</span>
              <span>₹300 / worker / hr</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between py-4">
            <span className="font-semibold">Estimated total</span>
            <strong className="font-display text-2xl">₹{estimate.toLocaleString('en-IN')}</strong>
          </div>
          <p className="mb-4 text-xs leading-5 text-slate-400">
            Final amount may vary if the job scope changes. You’ll confirm payment after the work.
          </p>
          <button
            disabled={mutation.isPending}
            className="w-full rounded-lg bg-forest-600 py-3 font-bold text-white transition hover:bg-forest-700 disabled:opacity-60"
          >
            {mutation.isPending ? 'Posting job…' : 'Post job and find crew'}
          </button>
          <p className="mt-3 text-center text-[11px] text-slate-400">No charge until the job is complete.</p>
        </aside>
      </form>
    </div>
  );
}
