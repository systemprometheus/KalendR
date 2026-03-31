'use client';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'dark' | 'light';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { icon: 'w-7 h-7', text: 'text-base', inner: 'w-4 h-4' },
  md: { icon: 'w-8 h-8', text: 'text-xl', inner: 'w-[18px] h-[18px]' },
  lg: { icon: 'w-10 h-10', text: 'text-2xl', inner: 'w-5 h-5' },
  xl: { icon: 'w-12 h-12', text: 'text-3xl', inner: 'w-6 h-6' },
};

export default function Logo({ size = 'md', variant = 'dark', showText = true, className = '' }: LogoProps) {
  const s = sizeMap[size];
  const textColor = variant === 'light' ? 'text-white' : 'text-gray-900';

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Gradient calendar icon */}
      <div className={`${s.icon} relative rounded-xl flex items-center justify-center overflow-hidden`}
        style={{ background: 'linear-gradient(135deg, #0069ff 0%, #6366f1 50%, #8b5cf6 100%)' }}>
        {/* Calendar top bar */}
        <div className="absolute top-[3px] left-0 right-0 flex justify-center gap-[5px]">
          <div className="w-[2px] h-[4px] bg-white/80 rounded-full" />
          <div className="w-[2px] h-[4px] bg-white/80 rounded-full" />
        </div>
        {/* Calendar grid dots */}
        <svg className={s.inner} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="6" width="14" height="1.5" rx="0.75" fill="white" opacity="0.5" />
          <rect x="4" y="10" width="3" height="3" rx="1" fill="white" opacity="0.9" />
          <rect x="8.5" y="10" width="3" height="3" rx="1" fill="white" opacity="0.6" />
          <rect x="13" y="10" width="3" height="3" rx="1" fill="white" opacity="0.4" />
          <rect x="4" y="15" width="3" height="1.5" rx="0.75" fill="white" opacity="0.3" />
          <rect x="8.5" y="15" width="3" height="1.5" rx="0.75" fill="white" opacity="0.3" />
        </svg>
      </div>

      {showText && (
        <span className={`${s.text} font-bold tracking-tight ${textColor}`}>
          kalendr<span style={{
            background: 'linear-gradient(135deg, #0069ff, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>.io</span>
        </span>
      )}
    </div>
  );
}
