export type TrailSummary = {
  id: number;
  name: string;
  park?: {
    name: string;
  } | null;
};

export async function getTrails(): Promise<TrailSummary[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/trails`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to load trails');
  }

  return res.json();
}
