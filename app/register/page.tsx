"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/lib/auth-context";
import { ApiError, api } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";

function RegisterContent() {
  const { register, googleLogin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const refCode = searchParams.get("ref")?.toUpperCase().trim() || "";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  // Validate referral code silently on load
  useEffect(() => {
    if (!refCode) return;
    api
      .get<{ valid: boolean; referrerName: string }>(`/referral/validate/${refCode}`, { auth: false })
      .then((d) => setReferrerName(d.referrerName))
      .catch(() => {});
  }, [refCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!country) {
      setError("Please select your country.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(fullName, email, password, country, refCode || undefined);
      router.push(next || "/onboarding");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSuccess(response: CredentialResponse) {
    if (!response.credential) return;
    setError(null);
    setSubmitting(true);
    try {
      const { isNew, user } = await googleLogin(response.credential, refCode || undefined);
      router.push(next || (user.isCoach ? "/coaches/dashboard" : (isNew ? "/onboarding" : "/dashboard")));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google sign-up failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl text-ink">Create your account</h1>
        <p className="text-ink-soft mt-1.5 text-sm">
          Free to start. Upload your CV to unlock personalized matches.
        </p>

        {/* Referral banner */}
        {referrerName && (
          <div className="mt-4 px-4 py-3 rounded-lg border border-rule bg-surface flex items-center gap-2.5">
            <span className="text-base">🎁</span>
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink">{referrerName}</span> invited you — when you subscribe, you both get a free month.
            </p>
          </div>
        )}

        <div className="mt-8">
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google sign-up failed. Please try again.")}
              theme="outline"
              size="large"
              width="360"
              text="signup_with"
            />
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-rule" />
            <span className="text-xs text-slate">or sign up with email</span>
            <div className="flex-1 border-t border-rule" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Full name</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Country</label>
            <select
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="input"
            >
              <option value="">Select your country…</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate mt-1.5">Used to tailor payment options and local context.</p>
          </div>

          {error && (
            <p className="text-alert text-sm">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-slate mt-6 text-center">
          Already have an account?{" "}
          <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-forest font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}
