"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { signin, signup } from "@/lib/api";
import { useAuthSession } from "@/lib/use-auth-session";
import { clearStoredSession, setStoredSession } from "@/lib/auth";
import {
  PASSWORD_POLICY_HINT,
  passwordMeetsPolicy,
} from "@/lib/password-policy";
import SavedParksPanel from "@/components/saved-parks-panel";

type AuthPanelProps = {
  compact?: boolean;
};

const allowedEmailDomains = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
]);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthPanel({ compact = false }: AuthPanelProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("OTHER");
  const [age, setAge] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isLoading: isLoadingUser, user } = useAuthSession();

  function hasAllowedEmailDomain(value: string) {
    const domain = value.trim().toLowerCase().split("@")[1] ?? "";
    return allowedEmailDomains.has(domain);
  }

  function hasValidEmail(value: string) {
    const normalized = value.trim().toLowerCase();
    return emailPattern.test(normalized) && hasAllowedEmailDomain(normalized);
  }

  const emailIsInvalid =
    mode === "signup" && email.length > 0 && !hasValidEmail(email);
  const passwordIsWeak =
    mode === "signup" && password.length > 0 && !passwordMeetsPolicy(password);
  const ageIsInvalid =
    mode === "signup" &&
    age.length > 0 &&
    (!/^\d+$/.test(age) || Number(age) < 13 || Number(age) > 120);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (mode === "signup" && !hasValidEmail(email)) {
      toast.error(
        "Please use a supported email provider such as Gmail, Yahoo, Outlook, iCloud, AOL, or Proton.",
      );
      return;
    }

    if (mode === "signup" && !passwordMeetsPolicy(password)) {
      toast.error(PASSWORD_POLICY_HINT);
      return;
    }

    if (mode === "signup" && password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (mode === "signup" && ageIsInvalid) {
      toast.error("Age must be a whole number between 13 and 120.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response =
        mode === "signup"
          ? await signup({ email, password, gender, age: Number(age) })
          : await signin({ email, password });

      setStoredSession(response.access_token, response.user);
      setPassword("");
      setConfirmPassword("");
      setAge("");
      setGender("OTHER");
      toast.success(
        mode === "signup"
          ? "Account created. You are now signed in."
          : "Signed in successfully.",
      );
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "Authentication failed.";
      const message =
        mode === "signup" && rawMessage.toLowerCase().includes("already exists")
          ? "This user already exists"
          : rawMessage;
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSignOut() {
    clearStoredSession();
    setPassword("");
    setConfirmPassword("");
    setAge("");
    setGender("OTHER");
    toast.success("Signed out.");
  }

  if (isLoadingUser) {
    return (
      <div
        className={`${compact ? "py-1 text-ink/72" : "glass-panel topo-ring rounded-[1.75rem] p-5 text-sm text-ink/88"}`}
      >
        Checking sign-in status...
      </div>
    );
  }

  if (user) {
    return (
      <div
        className={`${
          compact
            ? "text-[var(--foreground)]"
            : "glass-panel topo-ring rounded-[1.75rem] p-5 text-ink"
        } ${compact ? "py-1" : ""}`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]/62">
          Signed In
        </p>
        <h3 className="mt-3 text-3xl text-ink" data-display="true">
          {user.email}
        </h3>
        <p className="mt-3 text-sm leading-7 opacity-80">
          Save the places you love and share useful updates from your time on
          the trail.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.1rem] border border-ink/10 bg-[var(--surface-muted)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-ink/42">
              Access
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              Protected reports
            </p>
          </div>
          <div className="rounded-[1.1rem] border border-ink/10 bg-[var(--surface-muted)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-ink/42">
              Saved
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              Favorites + wish list
            </p>
          </div>
          <div className="rounded-[1.1rem] border border-ink/10 bg-[var(--surface-muted)] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-ink/42">
              Mode
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              Trail dashboard
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className={`mt-4 flex w-full items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition ${
            compact
              ? "bg-[var(--accent-strong)] text-white hover:brightness-110"
              : "bg-[var(--accent)] text-white hover:brightness-105"
          }`}
        >
          Sign out
        </button>
        <SavedParksPanel />
      </div>
    );
  }

  return (
    <div
      className={`${
        compact
          ? "text-[var(--foreground)]"
          : "glass-panel topo-ring rounded-[1.75rem] p-5 text-ink"
      } ${compact ? "py-1" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent-strong)]/62">
            Account
          </p>
          <h3 className="mt-3 text-3xl text-ink" data-display="true">
            {compact ? "Sign in to report" : "Make yourself at home."}
          </h3>
        </div>
        <div className="flex shrink-0 whitespace-nowrap rounded-full border border-current/15 bg-[var(--surface-muted)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("signin")}
            aria-pressed={mode === "signin"}
            className={`rounded-full px-3 py-1 font-semibold transition ${
              mode === "signin"
                ? compact
                  ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "bg-[var(--accent)] text-white"
                : "opacity-70"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            aria-pressed={mode === "signup"}
            className={`rounded-full px-3 py-1 font-semibold transition ${
              mode === "signup"
                ? compact
                  ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                  : "bg-[var(--accent)] text-white"
                : "opacity-70"
            }`}
          >
            Sign up
          </button>
        </div>
      </div>

      <p className="mt-3 text-sm leading-7 opacity-80">
        {mode === "signup"
          ? "Keep your favorite places close. Share what you find."
          : "Save your favorite parks and share trail updates."}
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="email"
          autoComplete="email"
          placeholder="Email address"
          aria-label="Email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
            compact
              ? "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink-on-light)] placeholder:text-[var(--ink-on-light-muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
              : "border-ink/10 bg-white text-ink placeholder:text-ink/34 focus:border-ink/28 focus:ring-4 focus:ring-white/10"
          }`}
          required
        />
        <input
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          placeholder="Password"
          aria-label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
            compact
              ? "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink-on-light)] placeholder:text-[var(--ink-on-light-muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
              : "border-ink/10 bg-white text-ink placeholder:text-ink/34 focus:border-ink/28 focus:ring-4 focus:ring-white/10"
          }`}
          minLength={mode === "signup" ? 12 : 8}
          required
        />
        {mode === "signin" ? (
          <div className="flex justify-end">
            <Link
              href="/auth/forgot-password"
              className={`text-sm font-medium underline underline-offset-4 transition ${
                compact
                  ? "text-[var(--accent-strong)] hover:opacity-80"
                  : "text-ink/88 hover:text-ink"
              }`}
            >
              Forgot password?
            </Link>
          </div>
        ) : null}
        {mode === "signup" ? (
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter password"
            aria-label="Confirm password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
              compact
                ? "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink-on-light)] placeholder:text-[var(--ink-on-light-muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
                : "border-ink/10 bg-white text-ink placeholder:text-ink/34 focus:border-ink/28 focus:ring-4 focus:ring-white/10"
            }`}
            minLength={12}
            required
          />
        ) : null}
        {mode === "signup" ? (
          <select
            aria-label="Gender"
            value={gender}
            onChange={(event) =>
              setGender(event.target.value as "MALE" | "FEMALE" | "OTHER")
            }
            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
              compact
                ? "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink-on-light)] focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
                : "border-ink/10 bg-white text-ink focus:border-ink/28 focus:ring-4 focus:ring-white/10"
            }`}
            required
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
        ) : null}
        {mode === "signup" ? (
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Age"
            aria-label="Age"
            value={age}
            onChange={(event) => {
              const nextValue = event.target.value.replace(/\D/g, "");
              setAge(nextValue);
            }}
            className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition ${
              compact
                ? "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink-on-light)] placeholder:text-[var(--ink-on-light-muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-emerald-100"
                : "border-ink/10 bg-white text-ink placeholder:text-ink/34 focus:border-ink/28 focus:ring-4 focus:ring-white/10"
            }`}
            required
          />
        ) : null}
        <button
          type="submit"
          disabled={
            isSubmitting ||
            (mode === "signup" &&
              ((confirmPassword.length > 0 && password !== confirmPassword) ||
                emailIsInvalid ||
                passwordIsWeak ||
                ageIsInvalid ||
                age.length === 0))
          }
          className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            compact
              ? "bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-ink hover:brightness-105"
              : "bg-[var(--accent)] text-white hover:brightness-105"
          }`}
        >
          {isSubmitting
            ? mode === "signup"
              ? "Creating account..."
              : "Signing in..."
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </button>
        {mode === "signup" ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              compact
                ? "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--ink-on-light)]"
                : "border-ink/10 bg-[var(--surface-muted)] text-ink"
            }`}
          >
            <ul className="list-disc space-y-1 pl-5">
              <li>Email must be valid.</li>
              <li>{PASSWORD_POLICY_HINT}</li>
            </ul>
            {emailIsInvalid || passwordIsWeak || ageIsInvalid ? (
              <div className="mt-3 space-y-1 font-medium text-rose-800">
                {emailIsInvalid ? (
                  <p>
                    Email is not valid. Use a supported provider such as Gmail,
                    Yahoo, Outlook, iCloud, AOL, or Proton.
                  </p>
                ) : null}
                {passwordIsWeak ? <p>{PASSWORD_POLICY_HINT}</p> : null}
                {ageIsInvalid ? (
                  <p>Age must be a whole number between 13 and 120.</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}
