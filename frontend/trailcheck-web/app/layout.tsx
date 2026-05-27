import type { Metadata } from "next";
import AppToaster from '@/components/app-toaster';
import Footer from '@/components/footer';
import "./globals.css";

export const metadata: Metadata = {
  title: "TrailCheck",
  description: "Live trail conditions, park alerts, weather, and visitor reports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="overflow-x-hidden">
        {children}
        <Footer />
        <AppToaster />
      </body>
    </html>
  );
}
