import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const initPushNotifications = async () => {
    if (!Capacitor.isNativePlatform()) return;

    try {
        const permission = await PushNotifications.requestPermissions();

        if (permission.receive !== 'granted') return;

        await PushNotifications.register();

        PushNotifications.addListener('registration', token => {
            console.log('FCM Token:', token.value);

            // Send token to backend API
            fetch('/api/save-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token.value })
            }).catch(err => console.warn('Failed to save FCM token:', err));
        });

        PushNotifications.addListener('pushNotificationReceived', notification => {
            console.log('Notification received:', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', action => {
            console.log('Notification clicked:', action);
        });
    } catch (error) {
        console.warn('Error initializing push notifications:', error);
    }
};
