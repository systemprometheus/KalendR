'use client';

import Image from 'next/image';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'dark' | 'light';
  showText?: boolean;
  className?: string;
}

const sizeMap = {
  xs: { wordmarkWidth: 87, wordmarkHeight: 17, iconWidth: 16, iconHeight: 17 },
  sm: { wordmarkWidth: 145, wordmarkHeight: 28, iconWidth: 26, iconHeight: 28 },
  md: { wordmarkWidth: 166, wordmarkHeight: 32, iconWidth: 29, iconHeight: 32 },
  lg: { wordmarkWidth: 207, wordmarkHeight: 40, iconWidth: 37, iconHeight: 40 },
  xl: { wordmarkWidth: 249, wordmarkHeight: 48, iconWidth: 44, iconHeight: 48 },
};

export default function Logo({ size = 'md', variant = 'dark', showText = true, className = '' }: LogoProps) {
  const s = sizeMap[size];
  const src = showText ? '/brand/kalendr-logo-clean.png' : '/brand/kalendr-logo-icon.png';
  const width = showText ? s.wordmarkWidth : s.iconWidth;
  const height = showText ? s.wordmarkHeight : s.iconHeight;
  const imageClass = variant === 'light'
    ? 'drop-shadow-[0_8px_20px_rgba(255,255,255,0.18)]'
    : '';

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src={src}
        alt={showText ? 'kalendr.io' : 'kalendr.io icon'}
        width={width}
        height={height}
        className={imageClass}
        priority={size !== 'xs' && size !== 'sm'}
        draggable={false}
      />
    </div>
  );
}
