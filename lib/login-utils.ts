import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export const handleLogin = async () => {
    if (Capacitor.isNativePlatform()) {
        await Browser.open({
            url: 'https://sonnearbystudents.vercel.app/login'
        });

        Browser.addListener('browserFinished', () => {
            window.location.reload();
        });
    } else {
        window.location.href = '/login';
    }
};
