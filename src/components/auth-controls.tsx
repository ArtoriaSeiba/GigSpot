"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { GoogleMark } from "@/components/google-mark";

export function AuthMessage({ children }: { children: string }) {
  return <p role="alert" className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200">{children}</p>;
}

export function GoogleContinue({ destination, oauthError, disabled = false }: {
  destination: string; oauthError?: string | null; disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    function restore(event: PageTransitionEvent) {
      if (event.persisted) setPending(false);
    }
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  async function openGoogle(useAnother: boolean) {
    if (pending || disabled) return;
    setPending(true);
    setFailed(false);
    try {
      await signIn("google", { callbackUrl: destination }, useAnother ? { prompt: "select_account" } : undefined);
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="auth-google space-y-2">
      <button type="button" disabled={pending || disabled} onClick={() => void openGoogle(false)}
        className="flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-[#747775] bg-white px-4 text-sm font-medium text-[#1f1f1f] transition-colors hover:bg-[#f4f7fc] disabled:opacity-70"
      >
        {pending ? <Loader2 aria-hidden="true" className="size-5 motion-safe:animate-spin" /> : <GoogleMark />}
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>
      {pending && <span role="status" className="sr-only">Opening Google…</span>}
      {!pending && (failed || oauthError) && (
        <AuthMessage>{oauthError === "OAuthAccountNotLinked" ? "Sign in using the method you originally used, or choose another Google account." : "Google sign-in didn’t finish. Try again or continue with email."}</AuthMessage>
      )}
      <button type="button" disabled={pending || disabled} onClick={() => void openGoogle(true)}
        className="min-h-8 text-xs font-medium text-violet-200 hover:underline disabled:opacity-50"
      >Use Another Google Account</button>
    </div>
  );
}

export function PasswordField({ id, label = "Password", isNew = false }: { id: string; label?: string; isNew?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-password-field space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <div className="relative">
        <input id={id} name={id} required type={visible ? "text" : "password"}
          autoComplete={isNew ? "new-password" : "current-password"} className="workspace-input pr-12" />
        <button type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          onClick={() => setVisible(!visible)} className="workspace-icon-button absolute right-0.5 top-1/2 -translate-y-1/2">
          {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
        </button>
      </div>
    </div>
  );
}
