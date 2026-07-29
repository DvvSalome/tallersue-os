import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DEMO_MODE } from "@/lib/demo/config";
import { AmbientBackground } from "@/components/ambient-bg";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "El Taller de los Sueños",
  description: "Encuesta participativa para jóvenes en Medellín",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AmbientBackground />
        {DEMO_MODE && (
          <div
            className="sticky top-0 z-50 px-3 py-1 text-center text-xs font-semibold text-white shadow-[0_4px_16px_-4px_rgba(242,115,74,0.4)]"
            style={{ background: "linear-gradient(90deg, #f2734a 0%, #ff9066 50%, #f2734a 100%)" }}
          >
            Modo demo — datos guardados solo en este navegador, sin base de datos real
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
