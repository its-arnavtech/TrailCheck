import USGlobePanel from './USGlobePanel';

export default function USMap3D() {
  return (
    <section className="w-full max-w-[72rem] rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(4,10,18,0.72),rgba(4,10,18,0.5))] p-4 text-white shadow-[0_40px_120px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-5">
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/56">
            U.S. Globe Scene
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            Explore the park map
          </h2>
        </div>
        <p className="max-w-xs text-right text-xs leading-5 text-white/58 sm:text-sm">
          Hover a marker to preview a park, then click it to open that park&apos;s page.
        </p>
      </div>

      <USGlobePanel
        label="Contiguous U.S."
        region="mainland"
        className="min-h-[22rem] sm:min-h-[28rem] lg:min-h-[34rem]"
      />
    </section>
  );
}
