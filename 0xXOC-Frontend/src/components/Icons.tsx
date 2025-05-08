import React from 'react';

interface IconProps {
  className?: string;
}

export function SunIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 16 16"
      className={className}
    >
      <rect x="7" y="0" width="2" height="2" fill="currentColor" />
      <rect x="7" y="14" width="2" height="2" fill="currentColor" />
      <rect x="0" y="7" width="2" height="2" fill="currentColor" />
      <rect x="14" y="7" width="2" height="2" fill="currentColor" />
      <rect x="2" y="2" width="2" height="2" fill="currentColor" />
      <rect x="12" y="2" width="2" height="2" fill="currentColor" />
      <rect x="2" y="12" width="2" height="2" fill="currentColor" />
      <rect x="12" y="12" width="2" height="2" fill="currentColor" />
      <rect x="5" y="5" width="6" height="6" fill="currentColor" />
    </svg>
  );
}

export function MoonIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 16 16"
      className={className}
    >
      <rect x="3" y="2" width="8" height="12" fill="currentColor" />
      <rect x="2" y="3" width="1" height="10" fill="currentColor" />
      <rect x="11" y="3" width="1" height="10" fill="currentColor" />
      <rect x="12" y="4" width="1" height="8" fill="currentColor" />
      <rect x="13" y="5" width="1" height="6" fill="currentColor" />
    </svg>
  );
}

export function HomeIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 16 16"
      className={className}
    >
      <rect x="7" y="1" width="2" height="2" fill="currentColor" />
      <rect x="5" y="3" width="6" height="2" fill="currentColor" />
      <rect x="3" y="5" width="10" height="2" fill="currentColor" />
      <rect x="3" y="7" width="10" height="8" fill="currentColor" />
      <rect x="5" y="10" width="6" height="5" fill="#0D0D0D" />
    </svg>
  );
}

export function SendIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 16 16"
      className={className}
    >
      <polygon points="0,0 16,8 0,16 4,8" fill="currentColor" />
    </svg>
  );
}

export function LoadingIcon({ className = 'w-6 h-6 animate-spin' }: IconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 16 16"
      className={className}
    >
      <rect x="7" y="0" width="2" height="3" fill="currentColor" />
      <rect x="13" y="2" width="2" height="3" fill="currentColor" opacity="0.8" />
      <rect x="14" y="7" width="2" height="3" fill="currentColor" opacity="0.6" />
      <rect x="13" y="12" width="2" height="3" fill="currentColor" opacity="0.4" />
      <rect x="7" y="13" width="2" height="3" fill="currentColor" opacity="0.3" />
      <rect x="1" y="12" width="2" height="3" fill="currentColor" opacity="0.2" />
      <rect x="0" y="7" width="2" height="3" fill="currentColor" opacity="0.1" />
      <rect x="1" y="2" width="2" height="3" fill="currentColor" opacity="0.05" />
    </svg>
  );
}

export function WalletIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 16 16"
      className={className}
    >
      <rect x="1" y="4" width="14" height="10" fill="currentColor" />
      <rect x="11" y="6" width="2" height="2" fill="#0D0D0D" />
      <rect x="1" y="2" width="10" height="2" fill="currentColor" />
    </svg>
  );
}

export function PlayIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 16 16"
      className={className}
    >
      <polygon points="3,2 13,8 3,14" fill="currentColor" />
    </svg>
  );
}

export function SkullIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 16 16"
      className={className}
    >
      <rect x="3" y="3" width="10" height="8" fill="currentColor" />
      <rect x="2" y="4" width="1" height="6" fill="currentColor" />
      <rect x="13" y="4" width="1" height="6" fill="currentColor" />
      <rect x="4" y="2" width="8" height="1" fill="currentColor" />
      <rect x="4" y="11" width="3" height="1" fill="currentColor" />
      <rect x="9" y="11" width="3" height="1" fill="currentColor" />
      <rect x="3" y="12" width="4" height="1" fill="currentColor" />
      <rect x="9" y="12" width="4" height="1" fill="currentColor" />
      <rect x="5" y="5" width="2" height="2" fill="#0D0D0D" />
      <rect x="9" y="5" width="2" height="2" fill="#0D0D0D" />
      <rect x="7" y="7" width="2" height="2" fill="#40E0D0" />
      <rect x="6" y="9" width="4" height="1" fill="#0D0D0D" />
    </svg>
  );
}

export function FireIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 16 16"
      className={className}
    >
      <rect x="7" y="1" width="2" height="3" fill="#FFD700" />
      <rect x="6" y="4" width="4" height="2" fill="#FFD700" />
      <rect x="5" y="6" width="6" height="3" fill="#FFD700" />
      <rect x="4" y="9" width="8" height="3" fill="#FFD700" />
      <rect x="3" y="12" width="10" height="3" fill="#FFD700" />
      <rect x="6" y="7" width="2" height="2" fill="#8B0000" />
      <rect x="8" y="9" width="2" height="2" fill="#8B0000" />
      <rect x="5" y="11" width="2" height="2" fill="#8B0000" />
    </svg>
  );
}

export function CoinIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 16 16"
      className={className}
    >
      <rect x="4" y="2" width="8" height="12" fill="#FFD700" />
      <rect x="3" y="3" width="1" height="10" fill="#FFD700" />
      <rect x="12" y="3" width="1" height="10" fill="#FFD700" />
      <rect x="7" y="6" width="2" height="4" fill="#0D0D0D" />
    </svg>
  );
} 