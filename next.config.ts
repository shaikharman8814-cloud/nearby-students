import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com https://cdn.jsdelivr.net https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
              "img-src 'self' blob: data: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://storage.googleapis.com https://api.dicebear.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://firestore.googleapis.com https://firebase.googleapis.com https://firebaseinstallations.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebasestorage.googleapis.com https://www.google-analytics.com https://*.google.com https://apis.google.com https://stats.g.doubleclick.net https://vitals.vercel-insights.com https://accounts.google.com wss://0.peerjs.com https://0.peerjs.com",
              "frame-src 'self' https://sone-app.firebaseapp.com https://sone-app.web.app https://accounts.google.com https://*.firebaseapp.com"
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(self), browsing-topics=()',
          }
        ],
      },
    ];
  },
};

export default nextConfig;
