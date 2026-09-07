import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[72vh] flex items-center justify-center px-6 py-20">
      <div className="max-w-lg w-full text-center">

        <div className="inline-block mb-8">
          <span className="stamp text-forest border-forest">Error 404 — Page Not Found</span>
        </div>

        <h1 className="font-display italic text-[8rem] sm:text-[10rem] leading-none font-semibold text-navy">
          404
        </h1>

        <div className="w-10 h-px bg-rule mx-auto my-6" />

        <p className="text-ink-soft text-base mb-2">
          This page doesn't exist — or it never did.
        </p>
        <p className="text-slate text-sm max-w-xs mx-auto mb-10">
          The case file you're looking for has been moved, deleted, or closed.
          Let's get you back on track.
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/" className="btn-primary">
            Back to Home
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Go to Dashboard
          </Link>
        </div>

        <p className="font-mono text-xs text-slate mt-12 tracking-widest uppercase">
          ScolarNav · Your journey continues elsewhere
        </p>

      </div>
    </div>
  );
}
