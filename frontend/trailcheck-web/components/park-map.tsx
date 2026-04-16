'use client';

import dynamic from 'next/dynamic';

const ParkMapScene = dynamic(() => import('@/components/maps/USMap3D'), {
  ssr: false,
  loading: () => (
    <section className="w-full max-w-[72rem] rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(4,10,18,0.72),rgba(4,10,18,0.5))] p-4 text-white shadow-[0_40px_120px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-5">
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/56">
            U.S. Globe Scene
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Globe-rendered U.S. park view with all 63 locations
          </h2>
        </div>
      </div>
      <div className="min-h-[22rem] rounded-[1.7rem] border border-white/12 bg-[radial-gradient(circle_at_top,rgba(21,35,52,0.9),rgba(6,14,23,0.96)_48%,rgba(4,10,18,0.98)_100%)] sm:min-h-[28rem] lg:min-h-[34rem]" />
    </section>
  ),
});

export default function ParkMap() {
  return <ParkMapScene />;
}
