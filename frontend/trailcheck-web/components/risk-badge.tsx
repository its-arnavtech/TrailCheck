type RiskLevel = 'LOW' | 'MODERATE' | 'MEDIUM' | 'HIGH' | 'EXTREME' | string | null | undefined;

type RiskBadgeProps = {
  level: RiskLevel;
  label?: string;
  subtle?: boolean;
};

const riskStyles: Record<string, string> = {
  LOW: 'border-emerald-300/30 bg-emerald-400/14 text-emerald-100',
  MODERATE: 'border-amber-300/30 bg-amber-400/14 text-amber-100',
  MEDIUM: 'border-amber-300/30 bg-amber-400/14 text-amber-100',
  HIGH: 'border-orange-300/30 bg-orange-400/16 text-orange-100',
  EXTREME: 'border-rose-300/30 bg-rose-400/16 text-rose-100',
};

export default function RiskBadge({
  level,
  label = 'Risk',
  subtle = false,
}: RiskBadgeProps) {
  const normalizedLevel = (level ?? 'UNKNOWN').toString().toUpperCase();
  const tone = riskStyles[normalizedLevel] ?? 'border-white/15 bg-white/8 text-white/80';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] ${
        subtle ? 'backdrop-blur-sm' : 'shadow-[0_12px_24px_rgba(0,0,0,0.18)] backdrop-blur-md'
      } ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-85" />
      {label} {normalizedLevel.toLowerCase()}
    </span>
  );
}
