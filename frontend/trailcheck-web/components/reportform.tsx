'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createReport } from '@/lib/api';
import {
  AUTH_STATE_CHANGED_EVENT,
  getStoredAuthToken,
  getStoredAuthUser,
} from '@/lib/auth';

export default function ReportForm({ trailId, flush = false }: { trailId: number; flush?: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(3);
  const [surface, setSurface] = useState('DRY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);

  useEffect(() => {
    function syncAuthState() {
      const token = getStoredAuthToken();
      const user = getStoredAuthUser();
      setSignedInEmail(token ? user?.email ?? null : null);
    }

    syncAuthState();
    window.addEventListener(AUTH_STATE_CHANGED_EVENT, syncAuthState);
    return () => window.removeEventListener(AUTH_STATE_CHANGED_EVENT, syncAuthState);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!getStoredAuthToken()) {
      toast.error('Please sign in to submit a trail report.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createReport({
        trailId,
        conditionRating: rating,
        surfaceCondition: surface,
        note: note || undefined,
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {signedInEmail ? (
        <div className="rounded-[1.35rem] border border-emerald-300/16 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-50">
          Signed in as {signedInEmail}
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className={flush ? '' : 'rounded-[1.45rem] border border-white/10 bg-white/6 px-4 py-4'}>
          <label className="mb-2 block text-sm font-semibold text-white/72">
            Trail notes
          </label>
          <textarea
            placeholder="Share mud, crowding, washouts, snow, closures, or anything the next hiker should know."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={6}
            className="w-full resize-none rounded-[1.1rem] border border-white/10 bg-[rgba(6,12,16,0.42)] px-4 py-3 text-sm text-white placeholder:text-white/34 shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
          />
        </div>

        <div className="space-y-5">
          <div className={flush ? '' : 'rounded-[1.45rem] border border-white/10 bg-white/6 px-4 py-4'}>
            <label className="mb-2 block text-sm font-semibold text-white/72">
              Surface condition
            </label>
            <select
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              className="w-full rounded-[1.1rem] border border-white/10 bg-[rgba(6,12,16,0.42)] px-4 py-3 text-sm text-white shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
            >
              <option value="DRY">Dry</option>
              <option value="MUDDY">Muddy</option>
              <option value="SNOWY">Snowy</option>
              <option value="ICY">Icy</option>
            </select>
          </div>

          <div className={flush ? '' : 'rounded-[1.45rem] border border-white/10 bg-white/6 px-4 py-4'}>
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-semibold text-white/72">Condition rating</label>
              <span className="text-sm font-medium text-white/62">{rating}/5</span>
            </div>
            <div className="mt-3 flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border text-xl transition-transform hover:scale-105 ${
                    star <= rating
                      ? 'border-amber-300/20 bg-amber-400/10 text-amber-200'
                      : 'border-white/10 bg-[rgba(6,12,16,0.42)] text-slate-500'
                  }`}
                >
                  {'\u2605'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6d8f80,#c8ddcf)] px-8 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-slate-950/10 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </form>
  );
}
