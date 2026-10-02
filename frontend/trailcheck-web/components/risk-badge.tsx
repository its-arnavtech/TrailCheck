type RiskLevel =
  | "LOW"
  | "MODERATE"
  | "MEDIUM"
  | "HIGH"
  | "EXTREME"
  | string
  | null
  | undefined;

type RiskBadgeProps = {
  level: RiskLevel;
  label?: string;
  subtle?: boolean;
};

const riskStyles: Record<string, string> = {
  LOW: "border-emerald-700/20 bg-emerald-50 text-emerald-800",
  MODERATE: "border-amber-700/20 bg-amber-50 text-amber-800",
  MEDIUM: "border-amber-700/20 bg-amber-50 text-amber-800",
  HIGH: "border-orange-700/20 bg-orange-50 text-orange-800",
  EXTREME: "border-rose-700/20 bg-rose-50 text-rose-800",
};

export default function RiskBadge({
  level,
  label = "Risk",
  subtle = false,
}: RiskBadgeProps) {
  const normalizedLevel = (level ?? "UNKNOWN").toString().toUpperCase();
  const tone =
    riskStyles[normalizedLevel] ??
    "border-ink/15 bg-[var(--surface-muted)] text-ink/80";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] ${
        subtle
          ? "backdrop-blur-sm"
          : "shadow-[0_12px_24px_rgba(0,0,0,0.18)] backdrop-blur-md"
      } ${tone}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-85" />
      {label} {normalizedLevel.toLowerCase()}
    </span>
  );
}
