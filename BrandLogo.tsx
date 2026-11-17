import React, { useState } from 'react';

interface BrandLogoProps {
  name: string;
  logoUrl?: string;
  size?: 'sm' | 'md';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ name, logoUrl, size = 'md' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const useCustomLogo = logoUrl && logoUrl !== '/icon.svg' && !imgFailed;

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      {useCustomLogo ? (
        <img
          src={logoUrl}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className={`${size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'} rounded-lg object-cover border border-[#E5DEC9]`}
        />
      ) : (
        <svg
          className={`${size === 'sm' ? 'h-7 w-7' : 'h-8 w-8'} shrink-0`}
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
        >
          <rect width="64" height="64" rx="14" fill="#1B4332" />
          <path d="M34 14C24.5 16 19 24 20.5 34C25 32 30.5 27.5 34 14Z" fill="#74C69D" />
          <path d="M34 14C30.5 27.5 25 32 20.5 34" stroke="#1B4332" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M33.5 22C42 24.5 47.5 32.5 44.5 41.5C42.2 48.8 34.2 51 27.5 47.8C22.2 45.2 20 39 23 32.8C25.5 27.6 29.2 23.5 33.5 22Z"
            fill="#E9DEC9"
          />
          <path
            d="M33.5 26.5C37 29.8 38.8 35.5 36.8 41.8"
            stroke="#1B4332"
            strokeOpacity="0.45"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
      <span
        className={`font-display font-semibold tracking-tight text-[#1C241E] ${
          size === 'sm' ? 'text-base' : 'text-lg sm:text-xl'
        }`}
      >
        {name || 'LORAKU DRY FRUITS'}
      </span>
    </span>
  );
};
