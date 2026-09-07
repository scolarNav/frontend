"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login, googleLogin } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
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
      const { isNew } = await googleLogin(response.credential);
      router.push(isNew ? "/onboarding" : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl text-ink">Welcome back</h1>
        <p className="text-ink-soft mt-1.5 text-sm">Sign in to your ScholarNav account.</p>

        <div className="mt-8">
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google sign-in failed. Please try again.")}
              theme="outline"
              size="large"
              width="360"
              text="signin_with"
            />
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 border-t border-rule" />
            <span className="text-xs text-slate">or continue with email</span>
            <div className="flex-1 border-t border-rule" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
            />
          </div>

          {error && (
            <p className="text-alert text-sm">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
            {submitting ? "Signing inâ€¦" : "Sign in"}
          </button>
        </form>

        <p className="text-sm text-slate mt-6 text-center">
          New here?{" "}
          <Link href="/register" className="text-forest font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
