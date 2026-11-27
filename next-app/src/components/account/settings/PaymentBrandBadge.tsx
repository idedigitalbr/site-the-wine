import React from 'react';

export function VisaBadge({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center justify-center bg-[#1A1F71] text-white font-extrabold text-[11px] tracking-wider px-2 py-0.5 rounded shadow-sm ${className}`}
      style={{ width: '42px', height: '24px' }}
      aria-label="Visa"
    >
      VISA
    </div>
  );
}

export function MastercardBadge({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center justify-center bg-[#181818] p-1 rounded border border-white/10 ${className}`}
      style={{ width: '42px', height: '24px' }}
      aria-label="Mastercard"
    >
      <span className="relative inline-block h-[15px] w-[24px]" aria-hidden="true">
        <span className="absolute left-0 top-0 h-[15px] w-[15px] rounded-full bg-[#EB001B]" />
        <span className="absolute right-0 top-0 h-[15px] w-[15px] rounded-full bg-[#F79E1B]/90" />
      </span>
    </div>
  );
}

export function PixBadge({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-flex items-center justify-center bg-transparent ${className}`}
      aria-label="PIX"
    >
      <span className="relative inline-block h-[18px] w-[18px]" aria-hidden="true">
        <span className="absolute inset-[2px] rotate-45 border-2 border-[#32BCAD]" />
        <span className="absolute inset-[6px] rotate-45 bg-[#32BCAD]" />
      </span>
    </div>
  );
}
