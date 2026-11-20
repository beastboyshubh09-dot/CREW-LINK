import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workersApi } from '../../api/workers';
import StatusBadge from '../../components/ui/StatusBadge';
import { ErrorState, LoadingRows } from '../../components/ui/ResourceStates';
import { useToast } from '../../context/ToastContext';
import { getBrowserLocation } from '../../utils/location';

export default function WorkerOverview() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['worker-dashboard'], queryFn: workersApi.dashboard });
  const [online, setOnline] = useState(null);
  const [sharing, setSharing] = useState(null);

  useEffect(() => {
    const handleOffline = () => { setOnline(false); setSharing(false); };
    window.addEventListener('crewlink:worker-offline', handleOffline);
    return () => window.removeEventListener('crewlink:worker-offline', handleOffline);
  }, []);

  const locationSharing = useMutation({
    mutationFn: async (enabled) => {
      let location;
      if (enabled) location = await currentLocation();
      return workersApi.setLocationSharing(enabled, location);
    },
    onSuccess: ({ enabled }) => {
      setSharing(enabled);
      if (!enabled) setOnline(false);
      queryClient.invalidateQueries({ queryKey: ['worker-dashboard'] });
      toast(enabled ? 'Location sharing enabled. You can now go available.' : 'Location sharing stopped.');
    },
    onError: (error) => toast(error.message || 'Could not update location sharing.', 'error')
  });

  const availability = useMutation({
    mutationFn: async (next) => {
      let location;
      if (next) {
        if (!(sharing ?? data.locationSharingEnabled)) throw new Error('Enable location sharing with your consent before going available.');
        location = await currentLocation();
      }
      return workersApi.setAvailability(next, location);
    },
    onSuccess: ({ online: next, location_sharing_enabled: enabled }) => {
      setOnline(next);
      if (!next) setSharing(enabled ?? false);
      queryClient.invalidateQueries({ queryKey: ['worker-dashboard'] });
      toast(next ? 'You’re available for nearby requests.' : 'You’re offline and location sharing has stopped.');
    },
    onError: (error) => toast(error.message || 'Could not update availability.', 'error')
  });

  if (isLoading) return <LoadingRows/>;
  if (isError) return <ErrorState onRetry={refetch}/>;

  const isOnline = online ?? data.online;
  const isSharing = sharing ?? data.locationSharingEnabled;

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-forest-700">WORKER OVERVIEW</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold">Your next good day starts here.</h1>
          <p className="mt-2 text-sm text-slate-500">You control whether your location is shared while you are available.</p>
        </div>
        <div className={`flex flex-col gap-4 rounded-xl border p-4 ${isOnline ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge status={isOnline ? 'online' : 'offline'}/>
              </div>
              <p className="mt-1 text-xs text-slate-500">{isOnline ? 'Receiving nearby requests' : 'Not receiving requests'}</p>
            </div>
            <Switch enabled={isOnline} label="Availability" busy={availability.isPending} onChange={() => availability.mutate(!isOnline)}/>
          </div>
          <div className="flex items-center justify-between gap-5 border-t border-slate-200 pt-3">
            <div>
              <p className="text-sm font-semibold">Share my location</p>
              <p className="mt-1 max-w-56 text-xs text-slate-500">{isSharing ? 'Location is used for nearby matching while available.' : 'Your location is not being shared.'}</p>
            </div>
            <Switch enabled={isSharing} label="Location sharing consent" busy={locationSharing.isPending} onChange={() => locationSharing.mutate(!isSharing)}/>
          </div>
          {data.location && (
            <p className="text-xs text-slate-500">
              Latest position: {data.location.lat.toFixed(5)}, {data.location.lng.toFixed(5)}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric title="Earned today" value={`₹${data.earningsToday.toLocaleString('en-IN')}`} note="Available after job close"/>
        <Metric title="This week" value={`₹${data.earningsWeek.toLocaleString('en-IN')}`} note={`${data.jobsThisWeek} jobs completed`}/>
        <Metric title="Your rating" value={`★ ${data.rating}`} note="From verified requesters"/>
      </div>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="font-display text-xl font-extrabold">Nearby requests</h2>
            <p className="mt-1 text-sm text-slate-500">Jobs matched to your location and availability.</p>
          </div>
          <Link to="/app/worker/requests" className="text-sm font-bold text-forest-700">All requests →</Link>
        </div>
        {isOnline ? (
          data.requests.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {data.requests.slice(0, 2).map((request) => (
                <RequestCard key={request.id} request={request}/>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-white p-8 text-center text-sm text-slate-500">
              No new requests right now. We’ll let you know when a nearby job comes in.
            </div>
          )
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="font-bold">You’re offline</p>
            <p className="mt-1 text-sm text-slate-500">Go online to receive jobs near you.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Switch({ enabled, label, busy, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onChange}
      disabled={busy}
      className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${enabled ? 'bg-forest-600' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${enabled ? 'left-6' : 'left-1'}`}/>
    </button>
  );
}

async function currentLocation() {
  return getBrowserLocation();
}

export function WorkerLocationPublisher() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['worker-dashboard'], queryFn: workersApi.dashboard, refetchInterval: 30_000 });
  const consecutiveFailuresRef = useRef(0);

  useEffect(() => {
    if (!data?.online || !data.locationSharingEnabled || !navigator?.geolocation) return undefined;
    let active = true;

    const publishLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          consecutiveFailuresRef.current = 0;
          try {
            await workersApi.updateLocation({ lat: coords.latitude, lng: coords.longitude });
          } catch (error) {
            if (active) {
              console.warn('Failed to update shared location:', error);
            }
          }
        },
        (error) => {
          if (!active) return;
          // Permission explicitly revoked by user in browser
          if (error.code === 1) {
            toast('Location permission was revoked. You are being taken offline.', 'error');
            workersApi.setAvailability(false)
              .then(() => {
                window.dispatchEvent(new Event('crewlink:worker-offline'));
                return queryClient.invalidateQueries({ queryKey: ['worker-dashboard'] });
              })
              .catch(() => {});
            return;
          }

          // Transient timeout (code 3) or unavailable (code 2): require 4 consecutive failures before going offline
          consecutiveFailuresRef.current += 1;
          if (consecutiveFailuresRef.current >= 4) {
            toast('GPS updates are unavailable. You are being taken offline.', 'error');
            workersApi.setAvailability(false)
              .then(() => {
                window.dispatchEvent(new Event('crewlink:worker-offline'));
                return queryClient.invalidateQueries({ queryKey: ['worker-dashboard'] });
              })
              .catch(() => {});
          }
        },
        { enableHighAccuracy: false, maximumAge: 30_000, timeout: 15_000 }
      );
    };

    publishLocation();
    const intervalId = window.setInterval(publishLocation, 30_000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [data?.online, data?.locationSharingEnabled, queryClient, toast]);

  return null;
}

function Metric({ title, value, note }) {
  return (
    <article className="rounded-xl border border-slate-100 bg-white p-5">
      <p className="text-sm font-semibold text-slate-500">{title}</p>
      <p className="mt-2 font-display text-3xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{note}</p>
    </article>
  );
}

export function RequestCard({ request }) {
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((request.expiresAt - Date.now()) / 1000)));
  const [done, setDone] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setInterval(() => setLeft(Math.max(0, Math.ceil((request.expiresAt - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [request.expiresAt]);

  const respond = useMutation({
    mutationFn: (decision) => workersApi.respond(request.id, decision),
    onSuccess: (result) => {
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ['worker-requests'] });
      queryClient.invalidateQueries({ queryKey: ['worker-active-job'] });
      toast(result.decision === 'accept' ? 'Job accepted. Opening your active job.' : 'Request declined.');
      if (result.decision === 'accept') navigate('/app/worker/active');
    }
  });

  return (
    <article className="rounded-xl border border-slate-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-forest-700">{request.jobId}</p>
          <h3 className="mt-1 font-display text-lg font-extrabold">{request.type}</h3>
        </div>
        <span className="rounded-lg bg-forest-50 px-3 py-1.5 font-display font-extrabold text-forest-700">₹{request.pay}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 border-y border-slate-100 py-3 text-xs">
        <div>
          <p className="text-slate-400">DISTANCE</p>
          <p className="mt-1 font-bold">{request.distance} km</p>
        </div>
        <div>
          <p className="text-slate-400">DURATION</p>
          <p className="mt-1 font-bold">{request.duration} hrs</p>
        </div>
        <div>
          <p className="text-slate-400">PICKUP</p>
          <p className="mt-1 truncate font-bold">{request.address}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className={`text-xs font-semibold ${left < 15 ? 'text-rose-700' : 'text-slate-500'}`}>
          {done ? 'Response recorded' : left ? `Expires in 0:${String(left).padStart(2, '0')}` : 'Request expired'}
        </p>
        <div className="flex gap-2">
          <button
            disabled={done || !left || respond.isPending}
            onClick={() => respond.mutate('decline')}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Decline
          </button>
          <button
            disabled={done || !left || respond.isPending}
            onClick={() => respond.mutate('accept')}
            className="rounded-lg bg-forest-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-forest-700 disabled:opacity-40"
          >
            Accept job
          </button>
        </div>
      </div>
    </article>
  );
}
