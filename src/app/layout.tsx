import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Providers from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GigSpot | Modern Gig Management & WebAR Rehearsal",
  description: "Centralized hub for local bands with AR fretboard projection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased relative`}>
        {/* Fixed Hardware-Accelerated Background */}
        <div className="fixed inset-0 pointer-events-none -z-50" style={{
          backgroundImage: `
            radial-gradient(circle at 15% 50%, rgba(34, 211, 238, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 85% 30%, rgba(129, 140, 248, 0.12) 0%, transparent 50%)
          `
        }} />
        <Toaster position="bottom-center" toastOptions={{
          style: { background: '#18181b', color: '#fff', border: '1px solid #27272a', borderRadius: '1rem' }
        }} />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
