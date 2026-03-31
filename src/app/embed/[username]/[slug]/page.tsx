'use client';
import { use } from 'react';
import BookingPage from '@/app/[username]/[slug]/page';

// This is the embeddable version - same as booking page but can be iframed
export default function EmbedBookingPage({ params }: { params: Promise<{ username: string; slug: string }> }) {
  return (
    <div className="kalendr-embed">
      <style>{`
        body { background: transparent !important; }
        .kalendr-embed { min-height: auto; }
      `}</style>
      <BookingPage params={params} />
    </div>
  );
}
