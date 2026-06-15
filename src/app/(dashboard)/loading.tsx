export default function DashboardLoading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        {/* Spinning ring with logo */}
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 animate-spin" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="28" stroke="#e2e8f0" strokeWidth="4" />
            <path d="M32 4 A28 28 0 0 1 60 32" stroke="url(#spin-grad)" strokeWidth="4" strokeLinecap="round" />
            <defs>
              <linearGradient id="spin-grad" x1="32" y1="4" x2="60" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#262262" />
                <stop offset="100%" stopColor="#92278F" />
              </linearGradient>
            </defs>
          </svg>
          {/* Logo in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Compunerd" className="w-8 h-8" />
          </div>
        </div>
        <p className="text-[13px] font-semibold text-[#262262]/60 tracking-wide">Loading…</p>
      </div>
    </div>
  );
}
