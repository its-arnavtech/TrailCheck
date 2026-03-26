'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { createReport } from '@/lib/api';

export default function ReportForm({ trailId }: { trailId: number }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(3);
  const [surface, setSurface] = useState('DRY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createReport({
        trailId,
        conditionRating: rating,
        surfaceCondition: surface,
        note: note || undefined,
        reporterName: 'Anonymous',
      });

      toast.success('Report submitted successfully!');
      setNote('');
      setRating(3);
      setSurface('DRY');
      router.refresh();
    } catch {
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Toaster position="bottom-right" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          placeholder="Notes about the trail condition..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
        />

        <select
          value={surface}
          onChange={(e) => setSurface(e.target.value)}
          className="w-full rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-sm text-[var(--foreground)] shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
        >
          <option value="DRY">Dry</option>
          <option value="MUDDY">Muddy</option>
          <option value="SNOWY">Snowy</option>
          <option value="ICY">Icy</option>
        </select>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/80 px-4 py-3">
          <label className="text-sm font-medium text-[var(--accent-strong)]">Rating:</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`text-2xl transition-transform hover:scale-110 ${
                  star <= rating ? 'text-amber-400' : 'text-emerald-200'
                }`}
              >
                {'\u2605'}
              </button>
            ))}
          </div>
          <span className="text-sm text-[var(--foreground)]/60">{rating}/5</span>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </>
  );
}
