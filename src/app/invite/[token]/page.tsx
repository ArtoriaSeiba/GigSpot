"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { GoogleContinue } from "@/components/auth-controls";
import { inviteAuthHref, isBandLinkToken, type BandLinkPreview } from "@/lib/band-link-invites";
import { WorkspaceRequestError, workspaceErrorMessage, workspaceMutation, workspaceRequest } from "@/lib/workspace-requests";

const unavailable = {
  invalid: { title: "Invite Link Unavailable", text: "Ask a band admin to share a new link." },
  accepted: { title: "Invite Already Used", text: "This link can be used once. Ask a band admin to share a new one." },
  expired: { title: "Invite Expired", text: "Ask a band admin to share a new link." },
  revoked: { title: "Invite Revoked", text: "A band admin disabled this link. Ask them for a new one." },
};

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <InviteCard key={token} token={token} />;
}

function InviteCard({ token }: { token: string }) {
  const [preview, setPreview] = useState<BandLinkPreview | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const callback = isBandLinkToken(token) ? `/invite/${token}` : null;

  useEffect(() => {
    if (!callback) return;
    const controller = new AbortController();
    workspaceRequest<BandLinkPreview>(`/api/band/join?token=${encodeURIComponent(token)}`, "Could not load the invite.", {
      signal: controller.signal,
      cache: "no-store",
    }).then((data) => {
      if (!controller.signal.aborted) setPreview(data);
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError(true);
    });
    return () => controller.abort();
  }, [callback, token, attempt]);

  function refreshPreview() {
    setPreview(null);
    setLoadError(false);
    setJoinError("");
    setAttempt((value) => value + 1);
  }

  async function joinBand() {
    if (joining) return;
    setJoining(true);
    setJoinError("");
    try {
      await workspaceMutation("/api/band/join", "POST", { token }, "Could not join the band. Try again.");
      window.location.replace("/dashboard");
    } catch (error) {
      if (error instanceof WorkspaceRequestError && error.status === 401) {
        window.location.assign(inviteAuthHref("/login", callback));
        return;
      }
      setJoinError(workspaceErrorMessage(error, "Could not join the band. Try again."));
      setJoining(false);
    }
  }

  const status = callback ? preview?.status : "invalid";
  const available = status === "pending" || status === "already-member";
  const problem = status && status !== "pending" && status !== "already-member" ? unavailable[status] : null;

  return (
    <AuthLayout title={available ? preview?.bandName ?? "Band Invitation" : problem?.title ?? "Band Invitation"}
      description={available ? status === "already-member" ? "You already belong to this band." : "You’re invited to join as a Musician." : problem?.text}>
        <div className="empty:hidden space-y-2">
          {!status && !loadError && <p role="status" className="text-sm text-zinc-300">Loading Invitation…</p>}
          {loadError && <p role="alert" className="text-sm text-red-300">Could not load the invite. Check your connection and try again.</p>}
          {joinError && <p role="alert" className="text-sm text-red-300">{joinError}</p>}
        </div>

        {available && (
          <div className="flex flex-wrap gap-2">
            {preview?.signedIn ? (
              <button type="button" className="workspace-primary" disabled={joining} onClick={() => void joinBand()}>
                {joining ? "Opening Band…" : status === "already-member" ? "Open Band" : "Join Band"}
              </button>
            ) : (
              <div className="w-full space-y-3">
                {callback && <GoogleContinue destination={callback} />}
                <div className="grid grid-cols-2 gap-2">
                  <Link href={inviteAuthHref("/login", callback)} className="workspace-secondary">Sign In With Email</Link>
                  <Link href={inviteAuthHref("/register", callback)} className="workspace-secondary">Create Account</Link>
                </div>
              </div>
            )}
            {joinError && <button type="button" className="workspace-secondary" onClick={refreshPreview}>Refresh Invite</button>}
          </div>
        )}
        {loadError && <button type="button" className="workspace-secondary" onClick={refreshPreview}>Try Again</button>}
        {problem && <Link href={preview?.signedIn ? "/dashboard" : "/"} className="workspace-secondary">{preview?.signedIn ? "Go To Dashboard" : "Go To Homepage"}</Link>}
    </AuthLayout>
  );
}
