/**
 * Standard Web Notifications & Supabase Realtime alerts helper
 */
export async function registerPushToken() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  if (Notification.permission === 'granted') {
    return 'browser-notifications-enabled';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return 'browser-notifications-enabled';
    }
  }

  return null;
}
