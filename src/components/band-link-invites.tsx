"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Clock3, Copy, Link2, MessageCircle, RefreshCw, UserRound, Users } from "lucide-react";
import toast from "react-hot-toast";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { canShareBandInvite, formatBandInviteMessage, type BandLinkInviteHistoryPage, type BandLinkInviteSummary, type InviteStatus } from "@/lib/band-link-invites";
import { buildWhatsAppUrl } from "@/lib/utils";
import { workspaceErrorMessage, workspaceMutation, workspaceRequest } from "@/lib/workspace-requests";

const endpoint = "/api/band/invite-link";
const statuses: Record<InviteStatus, { label: string; style: string }> = {
  pending: { label: "Pending", style: "bg-violet-400/15 text-violet-200" },
  accepted: { label: "Accepted", style: "bg-emerald-400/15 text-emerald-200" },
  expired: { label: "Expired", style: "bg-zinc-700/50 text-zinc-200" },
  revoked: { label: "Revoked", style: "bg-red-400/15 text-red-200" },
};
const formatDate = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function absoluteLink(path: string) {
  return new URL(path, window.location.origin).href;
}

function InviteDetails({ invite }: { invite: BandLinkInviteSummary }) {
  const status = statuses[invite.status];
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.style}`}>{status.label}</span>
        <span className="text-sm font-medium">Musician</span>
      </div>
      <p className="mt-1 break-words text-xs text-zinc-400">
        Created <time dateTime={invite.createdAt}>{formatDate(invite.createdAt)}</time>
        {invite.status === "pending" && <> · Expires <time dateTime={invite.expiresAt}>{formatDate(invite.expiresAt)}</time></>}
        {invite.acceptedBy && <> · Joined by {invite.acceptedBy}</>}
      </p>
    </div>
  );
}

function InviteHistory({ revision }: { revision: number }) {
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ page: number; data: BandLinkInviteHistoryPage | null }>();
  const current = result?.page === page ? result : undefined;

  useEffect(() => {
    const request = new AbortController();
    workspaceRequest<BandLinkInviteHistoryPage>(`${endpoint}?historyPage=${page}`, "Could not load invite history.", {
      signal: request.signal,
      cache: "no-store",
    }).then((data) => {
      if (!request.signal.aborted) setResult({ page, data });
    }).catch(() => {
      if (!request.signal.aborted) setResult({ page, data: null });
    });
    return () => request.abort();
  }, [page, revision, attempt]);

  return (
    <div id="band-invite-history" className="space-y-3">
      {!current && <p role="status" className="text-sm text-zinc-400">Loading Invite History…</p>}
      {current && !current.data && (
        <p role="alert" className="flex flex-wrap items-center gap-2 text-sm text-red-300">
          Could not load invite history.
          <button type="button" className="workspace-secondary" onClick={() => {
            setResult(undefined);
            setAttempt((value) => value + 1);
          }}>Try Again</button>
        </p>
      )}
      {current?.data && (
        <>
          {current.data.items.length === 0 ? (
            <p className="text-sm text-zinc-400">No invite history on this page.</p>
          ) : (
            <ul className="divide-y divide-white/10">
              {current.data.items.map((invite) => <li key={invite.id} className="py-3"><InviteDetails invite={invite} /></li>)}
            </ul>
          )}
          {(page > 1 || current.data.hasNextPage) && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="workspace-secondary">Previous</button>
              <span className="px-2 text-sm text-zinc-400">Page {page}</span>
              <button type="button" disabled={!current.data.hasNextPage} onClick={() => setPage((value) => value + 1)} className="workspace-secondary">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function BandLinkInvites({ bandName, open, onClose }: { bandName: string; open: boolean; onClose: () => void }) {
  const [invites, setInvites] = useState<BandLinkInviteSummary[] | null>(null);
  const [listError, setListError] = useState(false);
  const [selected, setSelected] = useState<BandLinkInviteSummary | null>(null);
  const [revoking, setRevoking] = useState<BandLinkInviteSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRevision, setHistoryRevision] = useState(0);
  const listRequest = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    listRequest.current?.abort();
    const request = new AbortController();
    listRequest.current = request;
    return workspaceRequest<BandLinkInviteSummary[]>(endpoint, "Could not load invites.", {
      signal: request.signal,
      cache: "no-store",
    }).then((result) => {
      if (!request.signal.aborted) {
        setInvites(result);
        setListError(false);
      }
    }).catch(() => {
      if (!request.signal.aborted) setListError(true);
    });
  }, []);

  const refreshLists = useCallback(() => {
    void refresh();
    setHistoryRevision((value) => value + 1);
  }, [refresh]);

  useEffect(() => {
    void refresh();
    window.addEventListener("focus", refreshLists);
    return () => {
      listRequest.current?.abort();
      window.removeEventListener("focus", refreshLists);
    };
  }, [refresh, refreshLists]);

  async function createInvite() {
    if (busy) return;
    setBusy(true);
    setActionError("");
    try {
      const invite = await workspaceRequest<BandLinkInviteSummary>(endpoint, "Could not create an invite. Try again.", { method: "POST" });
      setSelected(invite);
      setInvites((items) => [invite, ...(items ?? []).filter((item) => item.id !== invite.id)]);
      void refresh();
    } catch (error) {
      setActionError(workspaceErrorMessage(error, "Could not create an invite. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function copy(path: string) {
    try {
      await navigator.clipboard.writeText(absoluteLink(path));
      toast.success("Invite link copied.");
    } catch {
      toast.error("Could not copy the link. Open the invite to copy it manually.");
    }
  }

  async function revokeInvite() {
    if (!revoking || busy) return;
    setBusy(true);
    setActionError("");
    try {
      await workspaceMutation(endpoint, "DELETE", { id: revoking.id }, "Could not revoke this invite.");
      setInvites((items) => items?.filter((item) => item.id !== revoking.id) ?? null);
      setRevoking(null);
      toast.success("Invite revoked.");
    } catch (error) {
      setActionError(workspaceErrorMessage(error, "Could not revoke this invite. Try again."));
    } finally {
      setBusy(false);
      refreshLists();
    }
  }

  function closeCreator() {
    setSelected(null);
    setActionError("");
    onClose();
  }

  const currentInvite = invites === null ? selected : invites.find((invite) => invite.id === selected?.id);
  const invitePath = currentInvite?.path;
  const url = invitePath ? absoluteLink(invitePath) : null;
  const shareUrl = url && canShareBandInvite(url) ? buildWhatsAppUrl(formatBandInviteMessage(bandName, url)) : null;

  return (
    <>
      <section className="workspace-panel space-y-3" aria-labelledby="band-link-invites">
        <div className="flex items-center justify-between gap-3">
          <h2 id="band-link-invites" className="text-xl font-semibold">Invite Links</h2>
          <button type="button" onClick={refreshLists} className="workspace-icon-button" aria-label="Refresh Invite Links" title="Refresh Invite Links">
            <RefreshCw aria-hidden="true" className="size-4" />
          </button>
        </div>
        {listError && <p role="alert" className="text-sm text-red-300">Could not refresh the invite list. Try refreshing again.</p>}
        {!invites && !listError && <p role="status" className="text-sm text-zinc-400">Loading Invite Links…</p>}
        {invites?.length === 0 && <p className="text-sm text-zinc-400">No pending invite links. Use Invite Member to create one.</p>}
        {Boolean(invites?.length) && (
          <ul className="divide-y divide-white/10">
            {invites?.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <InviteDetails invite={invite} />
                {invite.path && (
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="workspace-secondary" onClick={() => {
                      setActionError("");
                      setSelected(invite);
                    }}>Share Link</button>
                    <button type="button" className="workspace-secondary" onClick={() => void copy(invite.path!)}>Copy Link</button>
                    <button type="button" className="workspace-secondary text-red-200" onClick={() => {
                      setActionError("");
                      setRevoking(invite);
                    }}>Revoke</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-3 border-t border-white/10 pt-2">
          <button type="button" aria-expanded={historyOpen} aria-controls={historyOpen ? "band-invite-history" : undefined}
            onClick={() => setHistoryOpen((value) => !value)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg text-sm font-semibold text-zinc-200 hover:text-white">
            Invite History <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
          </button>
          {historyOpen && <InviteHistory revision={historyRevision} />}
        </div>
      </section>

      {(open || selected) && (
        <WorkspaceDialog title="Invite Member" busy={busy} onDismiss={closeCreator}>
          <div className="space-y-5">
            <div className="workspace-row flex min-w-0 items-center gap-3 rounded-xl border p-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-violet-300/20 bg-violet-400/15 text-violet-100">
                <Users aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="break-words font-semibold leading-tight text-zinc-100">{bandName}</p>
                <p className="mt-1 text-sm text-zinc-400">Musician Access</p>
              </div>
            </div>

            {url && invitePath && currentInvite ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="band-invite-url" className="block text-sm font-semibold">Invite Link</label>
                  <input id="band-invite-url" value={url} readOnly onFocus={(event) => event.target.select()} className="workspace-input font-mono text-xs" />
                  <p className="flex items-center gap-2 text-sm text-zinc-400">
                    <Clock3 aria-hidden="true" className="size-4 shrink-0" />
                    <span>Single use · Expires <time dateTime={currentInvite.expiresAt}>{formatDate(currentInvite.expiresAt)}</time></span>
                  </p>
                </div>
                {!shareUrl && (
                  <p id="invite-whatsapp-availability" className="rounded-xl border border-violet-300/20 bg-violet-400/10 p-3 text-sm leading-relaxed text-zinc-200">
                    WhatsApp sharing is available from GigSpot’s public HTTPS address. Use Copy Link to test this invite on this computer.
                  </p>
                )}
                <div className="flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => void copy(invitePath)} className={shareUrl ? "workspace-secondary" : "workspace-primary"}>
                    <Copy aria-hidden="true" className="size-4" /> Copy Link
                  </button>
                  {shareUrl ? (
                    <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="workspace-primary">
                      <MessageCircle aria-hidden="true" className="size-4" /> Share On WhatsApp
                    </a>
                  ) : (
                    <button type="button" disabled aria-describedby="invite-whatsapp-availability" className="workspace-secondary">
                      <MessageCircle aria-hidden="true" className="size-4" /> Share On WhatsApp
                    </button>
                  )}
                </div>
              </>
            ) : selected ? (
              <p className="text-sm text-zinc-300">This link is no longer pending. Close this dialog to create a new one.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm leading-relaxed text-zinc-300">Create a link to share with one bandmate.</p>
                  <ul className="flex flex-wrap gap-2 text-xs font-medium text-zinc-200">
                    <li className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5">
                      <UserRound aria-hidden="true" className="size-3.5 text-violet-200" /> Single Use
                    </li>
                    <li className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5">
                      <Clock3 aria-hidden="true" className="size-3.5 text-violet-200" /> Expires In 7 Days
                    </li>
                  </ul>
                  <p className="text-xs leading-relaxed text-zinc-400">Create the link to see Copy Link and Share On WhatsApp.</p>
                </div>
                <div className="flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:justify-end">
                  <button type="button" className="workspace-secondary" disabled={busy} onClick={closeCreator}>Cancel</button>
                  <button type="button" className="workspace-primary" disabled={busy} onClick={() => void createInvite()}>
                    <Link2 aria-hidden="true" className="size-4" /> {busy ? "Creating Link…" : "Create Invite Link"}
                  </button>
                </div>
              </>
            )}
            {actionError && <p role="alert" className="text-sm text-red-300">{actionError}</p>}
          </div>
        </WorkspaceDialog>
      )}

      {revoking && (
        <WorkspaceDialog title="Revoke Invite Link?" busy={busy} onDismiss={() => setRevoking(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">Anyone you shared this link with will need a new invite.</p>
            {actionError && <p role="alert" className="text-sm text-red-300">{actionError}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="workspace-secondary" disabled={busy} onClick={() => setRevoking(null)}>Cancel</button>
              <button type="button" className="workspace-danger" disabled={busy} onClick={() => void revokeInvite()}>{busy ? "Revoking…" : "Revoke Link"}</button>
            </div>
          </div>
        </WorkspaceDialog>
      )}
    </>
  );
}
