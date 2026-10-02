"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { createReport } from "@/lib/api";
import { getStoredAuthToken } from "@/lib/auth";
import { useAuthSession } from "@/lib/use-auth-session";

export default function ReportForm({
  trailId,
  flush = false,
}: {
  trailId: number;
  flush?: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(3);
  const [surface, setSurface] = useState("DRY");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isLoading: isAuthLoading, user } = useAuthSession();
  const signedInEmail = user?.email ?? null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!getStoredAuthToken()) {
      toast.error("Please sign in to submit a trail report.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createReport({
        trailId,
        conditionRating: rating,
        surfaceCondition: surface,
        note: note.trim() || undefined,
      });

      toast.success("Report submitted successfully!");
      setNote("");
      setRating(3);
      setSurface("DRY");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit report. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isAuthLoading ? (
        <div className="rounded-[1.35rem] border border-ink/10 bg-[var(--surface-muted)] px-4 py-4 text-sm text-ink/70">
          Checking your session...
        </div>
      ) : signedInEmail ? (
        <div className="rounded-[1.35rem] border border-emerald-300/16 bg-emerald-400/10 px-4 py-4 text-sm text-emerald-800">
          Signed in as {signedInEmail}
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div
          className={
            flush
              ? ""
              : "rounded-[1.45rem] border border-ink/10 bg-[var(--surface-muted)] px-4 py-4"
          }
        >
          <label
            htmlFor={`report-note-${trailId}`}
            className="mb-2 block text-sm font-semibold text-ink/72"
          >
            Trail notes
          </label>
          <textarea
            id={`report-note-${trailId}`}
            maxLength={2000}
            placeholder="Share mud, crowding, washouts, snow, closures, or anything the next hiker should know."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={6}
            className="w-full resize-none rounded-[1.1rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink/34 shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
          />
        </div>

        <div className="space-y-5">
          <div
            className={
              flush
                ? ""
                : "rounded-[1.45rem] border border-ink/10 bg-[var(--surface-muted)] px-4 py-4"
            }
          >
            <label
              htmlFor={`report-surface-${trailId}`}
              className="mb-2 block text-sm font-semibold text-ink/72"
            >
              Surface condition
            </label>
            <select
              id={`report-surface-${trailId}`}
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              className="w-full rounded-[1.1rem] border border-ink/10 bg-white px-4 py-3 text-sm text-ink shadow-sm outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent)]/10"
            >
              <option value="DRY">Dry</option>
              <option value="MUDDY">Muddy</option>
              <option value="SNOWY">Snowy</option>
              <option value="ICY">Icy</option>
            </select>
          </div>

          <div
            className={
              flush
                ? ""
                : "rounded-[1.45rem] border border-ink/10 bg-[var(--surface-muted)] px-4 py-4"
            }
          >
            <div className="flex items-center justify-between gap-3">
              <span
                id={`report-rating-${trailId}`}
                className="text-sm font-semibold text-ink/72"
              >
                Condition rating
              </span>
              <span className="text-sm font-medium text-ink/62">
                {rating}/5
              </span>
            </div>
            <div
              className="mt-3 flex gap-2"
              role="group"
              aria-labelledby={`report-rating-${trailId}`}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`Rate trail condition ${star} out of 5`}
                  aria-pressed={star === rating}
                  onClick={() => setRating(star)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full border text-xl transition-transform hover:scale-105 ${
                    star <= rating
                      ? "border-amber-300/20 bg-amber-400/10 text-amber-800"
                      : "border-ink/10 bg-white text-slate-500"
                  }`}
                >
                  {"\u2605"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || isAuthLoading || !signedInEmail}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit Report"}
        </button>
      </div>
    </form>
  );
}
