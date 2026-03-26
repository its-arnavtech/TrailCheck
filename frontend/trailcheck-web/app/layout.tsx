import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
