type HazardTagProps = {
  label: string;
  severity?: string | null;
};

const severityStyles: Record<string, string> = {
  LOW: "border-emerald-300/22 bg-emerald-400/12 text-emerald-800",
  MODERATE: "border-amber-300/22 bg-amber-400/12 text-amber-800",
  MEDIUM: "border-amber-300/22 bg-amber-400/12 text-amber-800",
  HIGH: "border-orange-300/22 bg-orange-400/12 text-orange-800",
  EXTREME: "border-rose-300/22 bg-rose-400/12 text-rose-800",
};

export default function HazardTag({ label, severity }: HazardTagProps) {
  const tone =
    severityStyles[(severity ?? "").toUpperCase()] ??
    "border-ink/12 bg-[var(--surface-muted)] text-ink/76";

  return (
    <span
      className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.14)] ${tone}`}
    >
      {label}
    </span>
  );
}
