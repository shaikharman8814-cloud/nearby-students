importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
    apiKey: "AIzaSyBEoa7iaZB1zdLOlxptE1RpXZLxlAvTLsw",
    authDomain: "nearbystudents.firebaseapp.com",
    projectId: "nearbystudents",
    storageBucket: "nearbystudents.appspot.com",
    messagingSenderId: "979393873750",
    appId: "1:979393873750:web:d29bee219c16354446b8f7",
    measurementId: "G-JRRPWM55H7"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.png', // Assuming logo.png exists based on site-header N icon
        data: {
            // Requirement 6: Navigation link
            link: payload.data?.link || '/support'
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    // Requirement 6: On notification tap -> open app and navigate to relevant feedback
    const urlToOpen = event.notification.data.link || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
