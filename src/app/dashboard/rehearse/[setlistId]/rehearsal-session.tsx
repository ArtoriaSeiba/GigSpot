"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { workspaceErrorMessage, workspaceRequest } from "@/lib/workspace-requests";
import { RehearsalCamera, type RehearsalSong } from "./rehearsal-camera";

type GigResponse = {
  gig: {
    title: string;
    setlists: { id: string; name: string; songs: { song: RehearsalSong }[] }[];
  };
};

type SessionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; songs: RehearsalSong[]; setlist?: { name: string; gigTitle: string } };

export function RehearsalSession({ id, gigId }: { id: string; gigId?: string }) {
  const isDemo = id === "demo" && !gigId;
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const backHref = gigId ? `/dashboard/gigs/${encodeURIComponent(gigId)}` : isDemo ? "/dashboard/rehearse" : "/dashboard/repertoire";
  const backLabel = gigId ? "Gig Setlist" : isDemo ? "Rehearse" : "Repertoire";

  useEffect(() => {
    if (isDemo) return;
    const controller = new AbortController();
    const options = { signal: controller.signal };

    async function load() {
      try {
        if (gigId) {
          const { gig } = await workspaceRequest<GigResponse>(`/api/gigs/${encodeURIComponent(gigId)}`, "Could not load the gig setlist.", options);
          const setlist = gig.setlists.find((item) => item.id === id);
          if (!setlist) {
            if (!controller.signal.aborted) setState({ status: "error", message: "This setlist is no longer available for the gig." });
            return;
          }
          if (!controller.signal.aborted) setState({
            status: "ready",
            songs: setlist.songs.map(({ song }) => song),
            setlist: { name: setlist.name, gigTitle: gig.title },
          });
        } else {
          const songs = await workspaceRequest<RehearsalSong[]>("/api/songs", "Could not load the song.", options);
          const song = songs.find((item) => item.id === id);
          if (!controller.signal.aborted) setState(song
            ? { status: "ready", songs: [song] }
            : { status: "error", message: "This song is unavailable in the active band." });
        }
      } catch (error) {
        if (!controller.signal.aborted) setState({ status: "error", message: workspaceErrorMessage(error, "Could not load rehearsal. Check your connection and try again.") });
      }
    }

    void load();
    return () => controller.abort();
  }, [id, gigId, attempt, isDemo]);

  return (
    <div className="space-y-4">
      <Link href={backHref} className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm text-zinc-300 hover:text-white">
        <ArrowLeft aria-hidden="true" className="size-4" /> {backLabel}
      </Link>
      {isDemo ? <RehearsalCamera songs={[]} /> : state.status === "ready" && state.songs.length > 0 ? (
        <RehearsalCamera songs={state.songs} setlist={state.setlist} />
      ) : (
        <>
          <header className="workspace-header"><h1>Rehearsal</h1></header>
          <section className="workspace-panel space-y-3">
            {state.status === "loading" && <p role="status">Loading Rehearsal…</p>}
            {state.status === "error" && (
              <>
                <p role="alert">{state.message}</p>
                <button type="button" className="workspace-secondary" onClick={() => {
                  setState({ status: "loading" });
                  setAttempt((current) => current + 1);
                }}>Try Again</button>
              </>
            )}
            {state.status === "ready" && (
              <p>This setlist is empty. Open the gig to see its setlist.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
