"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Alert } from "@/components/ui/States";

function LoginContent() {
  const { login, googleLogin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      router.push(next || (user.isCoach ? "/coaches/dashboard" : "/dashboard"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSuccess(response: CredentialResponse) {
    if (!response.credential) return;
    setError(null);
    setSubmitting(true);
    try {
      const { isNew, user } = await googleLogin(response.credential);
      router.push(next || (user.isCoach ? "/coaches/dashboard" : (isNew ? "/onboarding" : "/dashboard")));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-form">
      <div className="card card-pad sm:p-8">
        <h1 className="h2">Welcome back</h1>
        <p className="mt-1.5 text-sm text-slate">Sign in to your ScolarNav account.</p>

        <div className="mt-6 flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Google sign-in failed. Please try again.")}
            theme="outline"
            size="large"
            width="320"
            text="signin_with"
          />
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="divider flex-1" />
          <span className="text-xs text-slate">or continue with email</span>
          <div className="divider flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
          <div>
            <label htmlFor="login-email" className="label">Email</label>
            <input
              id="login-email"
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
            <label htmlFor="login-password" className="label">Password</label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Your password"
            />
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <button type="submit" disabled={submitting} aria-busy={submitting} className="btn-primary btn-block">
            {submitting ? "Signing in" : "Sign in"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate">
        New here?{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-semibold text-forest hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
