"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { AuthMessage } from "@/components/auth-controls";
import { inviteAuthCallback, inviteAuthHref } from "@/lib/band-link-invites";

export default function ForgotPasswordPage() {
  return <Suspense fallback={<div className="workspace-shell min-h-dvh" />}><ForgotForm /></Suspense>;
}

function ForgotForm() {
  const callback = inviteAuthCallback(useSearchParams().get("callbackUrl"));
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, callback }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Could not send the reset link. Try again.");
        return;
      }
      if (process.env.NODE_ENV === "development" && typeof data.previewUrl === "string") setPreview(data.previewUrl);
      setSent(true);
    } catch {
      setError("Could not connect. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title={sent ? "Check Your Email" : "Forgot Password"} description={sent
      ? "If an account exists for that address, you’ll receive a link to reset your password."
      : "Enter your email to request a password reset link."}>
      {sent ? preview && <a href={preview} target="_blank" rel="noreferrer" className="workspace-secondary">Open Test Email</a> : (
        <form onSubmit={submit} className="space-y-4">
          {error && <AuthMessage>{error}</AuthMessage>}
          <label className="grid gap-1.5 text-sm font-medium">Email<input type="email" name="email" autoComplete="email" required className="workspace-input" /></label>
          <button type="submit" disabled={busy} className="workspace-primary w-full sm:w-full">{busy ? "Sending…" : "Send Reset Link"}</button>
        </form>
      )}
      <Link href={inviteAuthHref("/login", callback)} className="block text-sm font-semibold text-violet-200 hover:underline">Back To Sign In</Link>
    </AuthLayout>
  );
}
