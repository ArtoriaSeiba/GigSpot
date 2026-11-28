"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "./auth-layout";
import { AuthMessage, GoogleContinue, PasswordField } from "./auth-controls";
import { inviteAuthCallback, inviteAuthHref, type BandLinkPreview } from "@/lib/band-link-invites";

export function AuthEntry({ register = false, invite = null }: { register?: boolean; invite?: string | null }) {
  return <Suspense fallback={<div className="workspace-shell min-h-dvh" />}><EntryForm register={register} invite={invite} /></Suspense>;
}

function EntryForm({ register, invite }: { register: boolean; invite: string | null }) {
  const params = useSearchParams();
  const callback = inviteAuthCallback(params.get("callbackUrl")) ?? invite;
  const destination = callback ?? "/dashboard";
  const [inviteName, setInviteName] = useState<{ path: string; band: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!callback) return;
    const controller = new AbortController();
    const token = callback.slice("/invite/".length);
    fetch(`/api/band/join?token=${token}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return;
        const preview: BandLinkPreview = await res.json();
        if (!controller.signal.aborted && preview.status === "pending" && preview.bandName) {
          setInviteName({ path: callback, band: preview.bandName });
        }
      }).catch(() => {});
    return () => controller.abort();
  }, [callback]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    if (register && password !== form.get("confirmation")) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    let created = false;
    try {
      if (register) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: String(form.get("name")).trim(), email, password }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message || "Could not create your account.");
        }
        created = true;
      }
      const result = await signIn("credentials", { redirect: false, email, password });
      if (!result?.ok || result.error) throw new Error("Check your email and password, then try again.");
      window.location.replace(destination);
    } catch (cause) {
      if (created) {
        window.location.replace(inviteAuthHref("/login", callback) + (callback ? "&" : "?") + "created=1");
        return;
      }
      setError(cause instanceof Error && cause.message && !(cause instanceof TypeError) ? cause.message : "Could not connect. Try again.");
      setBusy(false);
    }
  }

  return (
    <AuthLayout registration={register} title={register ? "Create Account" : "Sign In"} description={inviteName && inviteName.path === callback
      ? `Continue to your invitation from ${inviteName.band}.`
      : callback ? "Continue to your band invitation." : register ? "Set up your GigSpot account." : "Open your GigSpot workspace."}>
      <GoogleContinue destination={destination} oauthError={params.get("error")} disabled={busy} />
      {params.get("created") === "1" && !register && <p role="status" className="text-sm text-emerald-200">Account created. Sign in with your email to continue.</p>}
      <div className="auth-email-divider flex items-center gap-3 text-xs font-medium text-zinc-400">
        <span className="h-px flex-1 bg-white/10" /> Or Continue With Email <span className="h-px flex-1 bg-white/10" />
      </div>
      <form onSubmit={submit} className={`auth-entry-fields ${register ? "space-y-2.5" : "space-y-3"}`}>
        {error && <AuthMessage>{error}</AuthMessage>}
        <div className={register ? "auth-identity auth-register-fields grid gap-2.5 min-[480px]:grid-cols-2" : "auth-identity"}>
          {register && <label className="grid min-w-0 gap-1 text-sm font-medium">Name<input name="name" autoComplete="name" required className="workspace-input" /></label>}
          <label className={`grid min-w-0 text-sm font-medium ${register ? "gap-1" : "gap-1.5"}`}>Email<input type="email" name="email" autoComplete={register ? "email" : "username"} required className="workspace-input" /></label>
        </div>
        <PasswordField id="password" isNew={register} />
        {register ? <PasswordField id="confirmation" label="Confirm Password" isNew /> :
          <Link href={callback ? `/forgot-password?${new URLSearchParams({ callbackUrl: callback })}` : "/forgot-password"} className="block w-fit text-xs font-semibold text-violet-200 hover:underline">Forgot Password?</Link>}
        <button type="submit" disabled={busy} className="workspace-primary w-full sm:w-full">
          {busy && <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />}
          {busy ? (register ? "Creating Account…" : "Signing In…") : register ? "Create Account" : "Sign In"}
        </button>
      </form>
      <p className="auth-switch text-center text-sm text-zinc-400">
        {register ? "Already have an account?" : "New to GigSpot?"}{" "}
        <Link href={inviteAuthHref(register ? "/login" : "/register", callback)} className="font-semibold text-violet-200 hover:underline">
          {register ? "Sign In" : "Create Account"}
        </Link>
      </p>
    </AuthLayout>
  );
}
