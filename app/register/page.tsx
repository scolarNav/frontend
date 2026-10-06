"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Gift } from "lucide-react";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/lib/auth-context";
import { ApiError, api } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import { Alert } from "@/components/ui/States";

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
  const [manualRef, setManualRef] = useState(refCode);
  const [showRefInput, setShowRefInput] = useState(!!refCode);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  useEffect(() => {
    if (!manualRef) { setReferrerName(null); return; }
    api
      .get<{ valid: boolean; referrerName: string }>(`/referral/validate/${manualRef}`, { auth: false })
      .then((d) => setReferrerName(d.referrerName))
      .catch(() => setReferrerName(null));
  }, [manualRef]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!country) {
      setError("Please select your country.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(fullName, email, password, country, manualRef || undefined);
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
      const { isNew, user } = await googleLogin(response.credential, manualRef || undefined);
      router.push(next || (user.isCoach ? "/coaches/dashboard" : (isNew ? "/onboarding" : "/dashboard")));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google sign-up failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-form">
      <div className="card card-pad sm:p-8">
        <h1 className="h2">Create your account</h1>
        <p className="mt-1.5 text-sm text-slate">Free to start. Upload your CV to unlock personalized matches.</p>

        {referrerName && (
          <div className="alert alert-info mt-4">
            <Gift size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>
              <span className="font-semibold">{referrerName}</span> invited you. When you subscribe, you both get a free month.
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google sign-up failed. Please try again.")}
            theme="outline"
            size="large"
            width="320"
            text="signup_with"
          />
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="divider flex-1" />
          <span className="text-xs text-slate">or sign up with email</span>
          <div className="divider flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-name" className="label">Full name</label>
            <input
              id="reg-name"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="label">Email</label>
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="reg-password" className="label">Password</label>
            <input
              id="reg-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label htmlFor="reg-country" className="label">Country</label>
            <select
              id="reg-country"
              required
              autoComplete="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="input"
            >
              <option value="">Select your country</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="help">Used to tailor payment options and local context.</p>
          </div>

          {!showRefInput ? (
            <button
              type="button"
              onClick={() => setShowRefInput(true)}
              className="min-h-touch text-left text-sm font-medium text-slate underline hover:text-ink"
            >
              Have a referral code?
            </button>
          ) : (
            <div>
              <label htmlFor="reg-ref" className="label">
                Referral code <span className="font-normal text-slate">(optional)</span>
              </label>
              <input
                id="reg-ref"
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value.toUpperCase().trim())}
                className="input tracking-widest"
                placeholder="e.g. ABC12345"
                maxLength={12}
              />
              {referrerName && <p className="mt-1.5 text-sm text-forest">Referred by {referrerName}. You both get a free month when you subscribe.</p>}
            </div>
          )}

          {error && <Alert variant="danger">{error}</Alert>}

          <button type="submit" disabled={submitting} aria-busy={submitting} className="btn-primary btn-block">
            {submitting ? "Creating account" : "Create account"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="font-semibold text-forest hover:underline">
          Sign in
        </Link>
      </p>
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
