"use client";

import { isFirebaseConfigured } from "@/lib/firebase";

const REQUIRED_VARS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
] as const;

export function FirebaseConfigGuard({ children }: { children: React.ReactNode }) {
  if (isFirebaseConfigured()) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-lg w-full rounded-xl border bg-card p-8 shadow-sm space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-800 text-xl font-bold">
          !
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">Firebase not configured</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This deployment is missing Firebase environment variables. Add them in your
            hosting provider (e.g. Vercel → Project Settings → Environment Variables),
            then redeploy so the build picks them up.
          </p>
        </div>
        <ul className="text-left text-xs font-mono bg-muted/60 rounded-lg p-4 space-y-1.5 text-muted-foreground">
          {REQUIRED_VARS.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Copy values from your local <code className="rounded bg-muted px-1">.env.local</code> or
          Firebase Console → Project settings. A redeploy is required after saving variables.
        </p>
      </div>
    </div>
  );
}
