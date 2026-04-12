import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { AuthWrappers } from "@/components/auth-wrappers";
import { Toaster } from 'sonner';
import { CallProvider } from "@/lib/call-context";
import { HttpsRedirectBanner } from "@/components/https-redirect-banner";
import { NotificationManager } from "@/components/notification-manager";
import { LayoutProvider } from "@/lib/layout-context";
import { OnboardingGate } from "@/components/onboarding-gate";
import { SecurityHardener } from "@/components/security-hardener";
import { CapacitorNative } from "@/components/capacitor-native";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NearbyStudents",
  description: "Connect with students near you",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <OnboardingGate>
            <SecurityHardener />
            <CapacitorNative />
            <LayoutProvider>
              <NotificationManager>
                <CallProvider>
                  <HttpsRedirectBanner />
                  <Toaster position="top-center" />
                  <AuthWrappers>
                    {children}
                  </AuthWrappers>
                </CallProvider>
              </NotificationManager>
            </LayoutProvider>
          </OnboardingGate>
        </AuthProvider>
      </body>
    </html>
  );
}
