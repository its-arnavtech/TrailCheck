'use client';

import dynamic from 'next/dynamic';

const ParkMap = dynamic(() => import('@/components/park-map'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[420px] rounded-[1.75rem] border border-white/10 bg-white/6" />
  ),
});

export default function LazyParkMap() {
  return <ParkMap />;
}
