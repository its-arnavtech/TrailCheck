import type { ParkMapRegion } from '@/lib/park-map-data';
import USGlobePanel from './USGlobePanel';

const INSET_SCENES: Array<{ key: ParkMapRegion; label: string }> = [
  { key: 'alaska', label: 'Alaska' },
  { key: 'hawaii', label: 'Hawaii' },
  { key: 'pacific', label: 'American Samoa' },
  { key: 'caribbean', label: 'Virgin Islands' },
];

export default function USMap3D() {
  return (
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
        <p className="max-w-xs text-right text-xs leading-5 text-white/58 sm:text-sm">
          Hover a point to reveal its park name while the globe stays framed tightly around the U.S. and each outlying area.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,2.15fr)_minmax(16rem,0.95fr)]">
        <USGlobePanel
          label="Contiguous U.S."
          region="mainland"
          className="min-h-[22rem] sm:min-h-[28rem] lg:min-h-[34rem]"
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {INSET_SCENES.map((scene) => (
            <USGlobePanel
              key={scene.key}
              label={scene.label}
              region={scene.key}
              className="min-h-[11rem] sm:min-h-[12rem] lg:min-h-[8rem]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
