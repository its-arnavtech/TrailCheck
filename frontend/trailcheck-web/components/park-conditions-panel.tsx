import { getParkDigest, type ParkDigest } from '@/lib/api';
import SafetyDigest from '@/components/safety-digest';

type ParkConditionsPanelProps = {
  parkSlug: string;
  parkName?: string;
  digest?: ParkDigest | null;
};

export async function ParkNotificationCard({
  parkSlug,
  parkName,
  digest,
}: ParkConditionsPanelProps) {
  const resolvedDigest = digest ?? (await getParkDigest(parkSlug).catch(() => null));

  return <SafetyDigest digest={resolvedDigest} parkName={parkName} compact />;
}

export function ParkNotificationCardFallback() {
  return (
    <div className="h-64 w-full animate-pulse rounded-[1.75rem] bg-white/8 lg:max-w-xl" />
  );
}

export async function ParkConditionsPanel({
  parkSlug,
  parkName,
  digest,
}: ParkConditionsPanelProps) {
  const resolvedDigest = digest ?? (await getParkDigest(parkSlug).catch(() => null));

  return <SafetyDigest digest={resolvedDigest} parkName={parkName} />;
}

export function ParkConditionsPanelFallback() {
  return (
    <section className="space-y-4">
      <div className="h-56 animate-pulse rounded-[1.75rem] bg-white/8" />
      <div className="h-48 animate-pulse rounded-[1.75rem] bg-white/8" />
    </section>
  );
}
