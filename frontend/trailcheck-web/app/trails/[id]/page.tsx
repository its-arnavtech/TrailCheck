import { notFound } from 'next/navigation';
import ReportForm from '@/components/reportform';
import { getTrail } from '@/lib/api';

type TrailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

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
