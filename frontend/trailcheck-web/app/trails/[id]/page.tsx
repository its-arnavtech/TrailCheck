import { notFound } from 'next/navigation';
import ReportForm from '@/components/reportform';

type TrailReport = {
  id: number;
  note: string | null;
  surfaceCondition: string;
  conditionRating: number;
};

type Trail = {
  id: number;
  name: string;
  park?: {
    name: string;
  } | null;
  reports?: TrailReport[];
};

type TrailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function getTrail(id: string): Promise<Trail | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/trails/${id}`, {
    cache: 'no-store',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load trail ${id}`);
  }

  return response.json();
}

export default async function TrailPage({ params }: TrailPageProps) {
  const { id } = await params;
  const trail = await getTrail(id);

  if (!trail) {
    notFound();
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">{trail.name}</h1>
      <p className="text-gray-600">{trail.park?.name ?? 'Unknown park'}</p>

      <h2 className="mt-6 text-xl font-semibold">Reports</h2>
      <div className="space-y-2">
        {trail.reports?.length ? (
          trail.reports.map((report) => (
            <div key={report.id} className="rounded border p-3">
              <p>{report.note || 'No notes provided.'}</p>
              <p className="text-sm text-gray-500">
                {report.surfaceCondition} - Rating: {report.conditionRating}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No reports yet.</p>
        )}
      </div>

      <ReportForm trailId={trail.id} />
    </main>
  );
}
