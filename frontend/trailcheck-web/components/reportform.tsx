'use client';

import { useState } from 'react';
import { createReport } from '@/lib/api';

export default function ReportForm({ trailId }: { trailId: number }) {
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(3);
  const [surface, setSurface] = useState('DRY');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    await createReport({
      trailId,
      conditionRating: rating,
      surfaceCondition: surface,
      note: note || undefined,
      reporterName: 'Anonymous',
    });

    // Refresh to fetch the newly created report from the server page.
    window.location.reload();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3">
      <h2 className="text-xl font-semibold">Submit your Report</h2>

      <input
        type="text"
        placeholder="Notes..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="border p-2 w-full"
      />
      <select
        value={surface}
        onChange={(e) => setSurface(e.target.value)}
        className="border p-2 w-full"
      >
        <option value="DRY">Dry</option>
        <option value="MUDDY">Muddy</option>
        <option value="SNOWY">Snowy</option>
        <option value="ICY">Icy</option>
      </select>
      <input
        type="number"
        min="1"
        max="5"
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
        className="border p-2 w-full"
      />
      <button className="bg-black text-white px-4 py-2 rounded">Submit</button>
    </form>
  );
}
