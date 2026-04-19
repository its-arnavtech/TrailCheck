export default function Footer() {
  return (
    <footer className="section-shell mt-14 pb-8 sm:pb-10">
      <div className="glass-panel topo-ring rounded-[2rem] px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]/62">
              TrailCheck
            </p>
            <h2 className="mt-3 text-3xl text-white sm:text-4xl" data-display="true">
              Trail intelligence for safer days outside.
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/68 sm:text-base">
              Live park alerts, weather, trail reports, and AI safety digests designed to help visitors make faster, more grounded decisions.
            </p>
          </div>

          <div className="space-y-2 text-sm text-white/66">
            <p>National park conditions, distilled into a calmer field dashboard.</p>
            <p>Contact: its.arnavk.here@gmail.com</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
