import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { USE_MOCK } from '../api/client';
import useWebSocket from './useWebSocket';

export default function useLiveEvents() {
  const { user, accessToken } = useAuth();
  const toast = useToast();
  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'job.status': toast(`Job ${event.job_id}: ${String(event.status).replaceAll('_', ' ')}.`); break;
      case 'job.request': toast(`New nearby job request: ${event.job?.type || 'Review the details'}.`); break;
      case 'crew.assigned': toast(`A crew has been assigned to job ${event.job_id}.`); break;
      default: break;
    }
  }, [toast]);
  const baseUrl = import.meta.env.VITE_WS_URL;
  const url = user && accessToken && baseUrl ? `${baseUrl.replace(/\/$/, '')}/events/?token=${encodeURIComponent(accessToken)}&role=${user.role}` : '';
  const status = useWebSocket(url, { enabled: !USE_MOCK && Boolean(url), onMessage: handleEvent });
  return { status };
}