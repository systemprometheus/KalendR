import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KalendR - Scheduling for Inbound Sales Teams',
  description: 'Book more qualified demos. Route leads to the right rep. Eliminate scheduling friction.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 text-gray-900 antialiased" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
