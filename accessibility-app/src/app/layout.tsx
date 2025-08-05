import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Accessibility Transport Tracker",
  description: "Track and analyze public transport accessibility for people with disabilities",
  keywords: ["accessibility", "transport", "disability", "public transport", "tracking"],
  authors: [{ name: "Accessibility Transport Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="reduced-motion">
      <head>
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="color-scheme" content="light dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} antialiased bg-gray-50 text-gray-900 min-h-screen`}>
        <div id="root" className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
