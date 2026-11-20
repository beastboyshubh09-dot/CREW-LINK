importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js');

const config = new URL(self.location.href).searchParams;
firebase.initializeApp({
  apiKey: config.get('apiKey'),
  authDomain: config.get('authDomain'),
  projectId: config.get('projectId'),
  storageBucket: config.get('storageBucket'),
  messagingSenderId: config.get('messagingSenderId'),
  appId: config.get('appId')
});

firebase.messaging().onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  self.registration.showNotification(notification.title || 'CrewLink', {
    body: notification.body || 'There is an update to your job.',
    icon: '/favicon.svg',
    data: payload.data || {}
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url || '/'));
});