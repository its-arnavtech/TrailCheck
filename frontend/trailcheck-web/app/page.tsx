import { getTrails } from '../lib/api';
import Link from 'next/link';

export default async function Home() {
  const trails = await getTrails();

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">TrailPulse</h1>

      {trails.map((trail: any) => (
        <Link key={trail.id} href={`/trails/${trail.id}`}>
          <div className="p-4 border mb-2">
            <h2>{trail.name}</h2>
            <p>{trail.park.name}</p>
          </div>
        </Link>
      ))}
    </main>
  );
}