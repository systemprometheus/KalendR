function AssetBrandIcon({
  alt,
  src,
  className = 'w-6 h-6',
  padded = false,
}: {
  alt: string;
  src: string;
  className?: string;
  padded?: boolean;
}) {
  return (
    <img
      alt={alt}
      src={src}
      className={`${className} ${padded ? 'p-0.5' : ''} object-contain`}
      draggable={false}
    />
  );
}

export function GoogleCalendarIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return <AssetBrandIcon alt="Google Calendar" src="/integrations/google-calendar-official.png" className={className} />;
}

export function MicrosoftOutlookIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 7.387v9.394a1.314 1.314 0 01-1.314 1.314H14.4v-12h8.286A1.314 1.314 0 0124 7.387z" fill="#1490DF"/>
      <path d="M24 7.387L14.4 13.2V6.095h8.286A1.314 1.314 0 0124 7.387z" fill="#1F7BD5"/>
      <path d="M14.4 6.095V18.095l-1.2.705L0 13.2V4.8a1.2 1.2 0 011.2-1.2h12a1.2 1.2 0 011.2 1.2v1.295z" fill="#2072C4"/>
      <path d="M0 4.8v14.4a1.2 1.2 0 001.2 1.2h12a1.2 1.2 0 001.2-1.2V6.095L0 4.8z" fill="#0364B8"/>
      <ellipse cx="5.7" cy="12.6" rx="3" ry="3.3" fill="#0364B8"/>
      <ellipse cx="5.7" cy="12.6" rx="2.1" ry="2.4" fill="#fff"/>
    </svg>
  );
}

export function ZoomIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="5" fill="#2D8CFF"/>
      <path d="M4 8.5a1.5 1.5 0 011.5-1.5h7.25a2.25 2.25 0 012.25 2.25v5a1.5 1.5 0 01-1.5 1.5H6.25A2.25 2.25 0 014 13.5v-5z" fill="#fff"/>
      <path d="M16 10.5l3.2-2.133a.5.5 0 01.8.4v6.466a.5.5 0 01-.8.4L16 13.5v-3z" fill="#fff"/>
    </svg>
  );
}

export function GoogleMeetIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return <AssetBrandIcon alt="Google Meet" src="/integrations/google-meet-official.svg" className={className} />;
}

export function StripeIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="4" fill="#635BFF"/>
      <path d="M11.2 9.82c0-.73.6-1.01 1.59-1.01.93 0 2.1.28 3.03.79V6.83c-1.01-.4-2.01-.56-3.03-.56-2.48 0-4.13 1.3-4.13 3.46 0 3.37 4.64 2.83 4.64 4.28 0 .87-.75 1.14-1.81 1.14-1.04 0-2.38-.43-3.44-1.01v2.81c1.17.5 2.35.72 3.44.72 2.54 0 4.29-1.26 4.29-3.46-.01-3.64-4.58-2.99-4.58-4.39z" fill="#fff"/>
    </svg>
  );
}

export function SalesforceIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4.5a4.2 4.2 0 013.5 1.8 5.1 5.1 0 017.5 4.3 4.5 4.5 0 01-1.1 8.9H4.8a3.8 3.8 0 01-1.3-7.4A4.8 4.8 0 0110 4.5z" fill="#00A1E0"/>
    </svg>
  );
}

export function HubSpotIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.1 9.4V6.8a1.8 1.8 0 001-1.6V5.1a1.8 1.8 0 00-1.8-1.8h-.1a1.8 1.8 0 00-1.8 1.8v.1a1.8 1.8 0 001 1.6v2.6a5.2 5.2 0 00-2.4 1.1L6.3 5.8a1.9 1.9 0 00.1-.6 2 2 0 10-2 2c.4 0 .8-.1 1.1-.4l6.6 4.6a5.2 5.2 0 00-.7 2.6c0 1 .3 1.9.7 2.6l-2 2a1.6 1.6 0 00-.5-.1 1.8 1.8 0 100 3.6 1.8 1.8 0 001.8-1.8c0-.3-.1-.6-.2-.8l1.9-1.9a5.2 5.2 0 103.9-8.2z" fill="#FF7A59"/>
      <circle cx="16.5" cy="14" r="2.7" fill="#FF7A59"/>
    </svg>
  );
}

export function SlackIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5.042 15.166a2.528 2.528 0 01-2.52 2.521A2.528 2.528 0 010 15.166a2.528 2.528 0 012.521-2.52h2.521v2.52zM6.313 15.166a2.528 2.528 0 012.521-2.52 2.528 2.528 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.521v-6.313z" fill="#E01E5A"/>
      <path d="M8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.521v2.521H8.834zM8.834 6.313a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.521A2.528 2.528 0 010 8.834a2.528 2.528 0 012.521-2.521h6.313z" fill="#36C5F0"/>
      <path d="M18.958 8.834a2.528 2.528 0 012.521-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.521 2.521h-2.521V8.834zM17.687 8.834a2.528 2.528 0 01-2.521 2.521 2.528 2.528 0 01-2.521-2.521V2.521A2.528 2.528 0 0115.166 0a2.528 2.528 0 012.521 2.521v6.313z" fill="#2EB67D"/>
      <path d="M15.166 18.958a2.528 2.528 0 012.521 2.521A2.528 2.528 0 0115.166 24a2.528 2.528 0 01-2.521-2.521v-2.521h2.521zM15.166 17.687a2.528 2.528 0 01-2.521-2.521 2.528 2.528 0 012.521-2.521h6.313A2.528 2.528 0 0124 15.166a2.528 2.528 0 01-2.521 2.521h-6.313z" fill="#ECB22E"/>
    </svg>
  );
}

export function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export function MicrosoftIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
      <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
    </svg>
  );
}
