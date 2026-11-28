"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { AuthMessage, PasswordField } from "@/components/auth-controls";
import { inviteAuthCallback, inviteAuthHref } from "@/lib/band-link-invites";

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="workspace-shell min-h-dvh" />}><ResetForm /></Suspense>;
}

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const callback = inviteAuthCallback(params.get("callbackUrl"));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const password = data.get("password");
    if (password !== data.get("confirmation")) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || "Could not reset your password.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Could not connect. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title={saved ? "Password Updated" : "Reset Password"}
      description={saved ? "Sign in with your new password." : token ? "Choose a new password for your GigSpot account." : "This reset link is missing its token. Request a new link."}>
      {!saved && token && (
        <form onSubmit={submit} className="space-y-4">
          {error && <AuthMessage>{error}</AuthMessage>}
          <PasswordField id="password" label="New Password" isNew />
          <PasswordField id="confirmation" label="Confirm New Password" isNew />
          <button type="submit" disabled={busy} className="workspace-primary w-full sm:w-full">{busy ? "Saving…" : "Update Password"}</button>
        </form>
      )}
      {!saved && <Link href={callback ? `/forgot-password?${new URLSearchParams({ callbackUrl: callback })}` : "/forgot-password"} className="block text-sm text-violet-200 hover:underline">Request A New Link</Link>}
      <Link href={inviteAuthHref("/login", callback)} className={saved ? "workspace-primary" : "block text-sm font-semibold text-violet-200 hover:underline"}>Back To Sign In</Link>
    </AuthLayout>
  );
}
