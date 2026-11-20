import { api, USE_MOCK } from '../api/client';

export async function registerPushToken() {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };
  if (Object.values(config).some((value) => !value) || !import.meta.env.VITE_FIREBASE_VAPID_KEY || !('Notification' in window) || !('serviceWorker' in navigator)) return null;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;
  const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported }] = await Promise.all([import('@firebase/app'), import('@firebase/messaging')]);
  if (!await isSupported()) return null;
  const app = getApps().length ? getApps()[0] : initializeApp(config);
  const workerUrl = new URL('/firebase-messaging-sw.js', window.location.origin);
  Object.entries(config).forEach(([key, value]) => workerUrl.searchParams.set(key, value || ''));
  const serviceWorkerRegistration = await navigator.serviceWorker.register(workerUrl, { scope: '/firebase-messaging/' });
  const token = await getToken(getMessaging(app), { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY, serviceWorkerRegistration });
  if (token && !USE_MOCK) await api.post('/notifications/devices/', { token, platform: 'web' });
  return token || null;
}