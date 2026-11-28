"use client";

import { use, useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Calendar, GripVertical, ListMusic, MessageCircle, Music, NotebookPen, Play, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Reorder, useDragControls } from "framer-motion";
import toast from "react-hot-toast";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { SongRehearsalDetails } from "@/components/song-rehearsal-details";
import type { SongRehearsal } from "@/lib/song-rehearsal";
import { buildWhatsAppUrl, formatGigCallSheet } from "@/lib/utils";
import { matchesSongSearch, WorkspaceRequestError, workspaceErrorMessage, workspaceMutation, workspaceRequest, type BandRole } from "@/lib/workspace-requests";

type Song = SongRehearsal & { id: string; artist: string | null };
type SetlistSong = { id: string; order: number; song: Song };
type Gig = {
  id: string;
  title: string;
  date: string;
  venue: string;
  loadInTime?: string | null;
  notes?: string | null;
  setlists: { id: string; songs: SetlistSong[] }[];
};
type GigData = { gig: Gig; availableSongs: Song[] };
type SetlistState =
  | { status: "loading" | "error" | "missing" }
  | { status: "ready"; data: GigData; isAdmin: boolean };

function SetlistRow({ item, index, canEdit, busy, allowRemove, first, last, onMove, onRemove, onNotes }: {
  item: SetlistSong;
  index: number;
  canEdit: boolean;
  busy: boolean;
  allowRemove: boolean;
  first: boolean;
  last: boolean;
  onMove: (offset: number) => void;
  onRemove: () => void;
  onNotes: () => void;
}) {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      className="workspace-row relative flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border p-2"
    >
      <span aria-hidden="true" className="w-6 shrink-0 text-center text-xs tabular-nums text-zinc-400">{index + 1}</span>
      {canEdit && (
        <span
          aria-hidden="true"
          onPointerDown={(event) => {
            if (!busy) dragControls.start(event);
          }}
          className={`grid size-11 shrink-0 touch-none place-items-center rounded-lg text-zinc-400 ${busy ? "opacity-40" : "cursor-grab hover:bg-white/10 active:cursor-grabbing"}`}
        >
          <GripVertical className="size-5" />
        </span>
      )}
      <div className="min-w-24 flex-1">
        <p className="break-words text-sm font-semibold">{item.song.title}</p>
        <p className="flex flex-wrap gap-x-2 text-xs text-zinc-400">
          {item.song.key && <span>Key {item.song.key}</span>}
          {item.song.tempo !== null && <span>{item.song.tempo} BPM</span>}
        </p>
      </div>
      <div className="ml-auto flex shrink-0 items-center">
        {(item.song.rehearsalNotes || item.song.chordChart) && (
          <button type="button" className="workspace-icon-button" aria-label={`Rehearsal Notes for ${item.song.title}`} onClick={onNotes}><NotebookPen aria-hidden="true" className="size-4" /></button>
        )}
        {canEdit && (
          <>
            <button type="button" className="workspace-icon-button" aria-label={`Move ${item.song.title} up`} disabled={busy || first} onClick={() => onMove(-1)}><ArrowUp aria-hidden="true" className="size-4" /></button>
            <button type="button" className="workspace-icon-button" aria-label={`Move ${item.song.title} down`} disabled={busy || last} onClick={() => onMove(1)}><ArrowDown aria-hidden="true" className="size-4" /></button>
            <button type="button" className="workspace-icon-button hover:text-red-300" aria-label={`Remove ${item.song.title} from setlist`} disabled={busy || !allowRemove} onClick={onRemove}><Trash2 aria-hidden="true" className="size-4" /></button>
          </>
        )}
      </div>
    </Reorder.Item>
  );
}

export default function GigSetlistPage({ params }: { params: Promise<{ gigId: string }> }) {
  const { gigId } = use(params);
  return <GigSetlist key={gigId} gigId={gigId} />;
}

function GigSetlist({ gigId }: { gigId: string }) {
  const [state, setState] = useState<SetlistState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<Song>();
  const [draft, setDraft] = useState<SetlistSong[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const endpoint = `/api/gigs/${gigId}`;

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };

    async function load() {
      try {
        const [data, band] = await Promise.all([
          workspaceRequest<GigData>(endpoint, "Could not load this gig.", options),
          workspaceRequest<BandRole>("/api/band/role", "Could not load your band.", options),
        ]);
        if (!controller.signal.aborted) setState({ status: "ready", data, isAdmin: band.role === "ADMIN" });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState({ status: error instanceof WorkspaceRequestError && error.status === 404 ? "missing" : "error" });
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [endpoint, attempt]);

  if (state.status !== "ready") {
    return (
      <section className="workspace-panel space-y-3">
        {state.status === "loading" && <p role="status" className="text-sm text-zinc-400">Loading Gig And Setlist…</p>}
        {state.status === "missing" && <h1 className="text-xl font-semibold">Gig Not Found In The Active Band</h1>}
        {state.status === "error" && (
          <>
            <p role="alert">Could not load this gig.</p>
            <button type="button" className="workspace-secondary" onClick={() => {
              setState({ status: "loading" });
              setAttempt((value) => value + 1);
            }}>Try Again</button>
          </>
        )}
        {state.status !== "loading" && <Link href="/dashboard/gigs" className="block text-sm text-indigo-300">Back To Gigs</Link>}
      </section>
    );
  }

  const { gig, availableSongs } = state.data;
  const { isAdmin } = state;
  const savedSetlist = gig.setlists[0];
  const savedSongs = savedSetlist?.songs ?? [];
  const songs = draft ?? savedSongs;
  const added = new Set(savedSongs.map((item) => item.song.id));
  const available = availableSongs.filter((song) => !added.has(song.id));
  const matches = available.filter((song) => matchesSongSearch(song, query));
  const busy = pending !== null;

  function updateSetlist(id: string, next: SetlistSong[]) {
    setState((current) => {
      if (current.status !== "ready") return current;
      const [firstSetlist, ...otherSetlists] = current.data.gig.setlists;
      return {
        ...current,
        data: {
          ...current.data,
          gig: { ...current.data.gig, setlists: [{ ...firstSetlist, id, songs: next }, ...otherSetlists] },
        },
      };
    });
  }

  function reorder(next: SetlistSong[]) {
    if (busy || !isAdmin) return;
    setDraft(next.every((item, index) => item.id === savedSongs[index]?.id) ? null : next);
    setSaveStatus("idle");
  }

  function move(index: number, offset: number) {
    const next = [...songs];
    const destination = index + offset;
    if (destination < 0 || destination >= next.length) return;
    [next[index], next[destination]] = [next[destination], next[index]];
    reorder(next);
  }

  async function saveOrder() {
    if (!isAdmin || busy || !draft || !savedSetlist) return;
    setPending("order");
    setSaveStatus("idle");
    const orderedSongs = draft.map((item, index) => ({ ...item, order: index + 1 }));
    try {
      await workspaceMutation(endpoint, "PUT", {
        reorderedSongs: orderedSongs.map(({ id, order }) => ({ id, order })),
      }, "Could not save setlist order.");
      updateSetlist(savedSetlist.id, orderedSongs);
      setDraft(null);
      setSaveStatus("saved");
      toast.success("Setlist order saved.");
    } catch {
      setSaveStatus("error");
      toast.error("Could not save the order. Your changes are ready to retry.");
    } finally {
      setPending(null);
    }
  }

  async function addSong(songId: string) {
    if (!isAdmin || busy || draft) return;
    setPending(songId);
    try {
      const item = await workspaceMutation<SetlistSong & { setlistId: string }>(endpoint, "POST", { songId }, "Could not add the song.");
      updateSetlist(item.setlistId, [...savedSongs, item]);
      setSaveStatus("idle");
      toast.success("Song added to the setlist.");
    } catch (error) {
      toast.error(workspaceErrorMessage(error, "Could not add the song. Please try again."));
    } finally {
      setPending(null);
    }
  }

  async function removeSong(setlistSongId: string) {
    if (!isAdmin || busy || draft || !savedSetlist) return;
    setPending(setlistSongId);
    try {
      await workspaceMutation(endpoint, "DELETE", { setlistSongId }, "Could not remove the song.");
      updateSetlist(savedSetlist.id, savedSongs.filter((item) => item.id !== setlistSongId));
      setSaveStatus("idle");
      toast.success("Song removed from the setlist.");
    } catch (error) {
      toast.error(workspaceErrorMessage(error, "Could not remove the song. Please try again."));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/dashboard/gigs" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm text-zinc-300 hover:text-white">
        <ArrowLeft aria-hidden="true" className="size-4" /> Back To Gigs
      </Link>
      <header className="workspace-header">
        <div className="min-w-0">
          <h1 className="break-words">{gig.title}</h1>
          <p className="flex items-center gap-2"><Calendar aria-hidden="true" className="size-4" />{new Date(gig.date).toLocaleDateString()}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {savedSetlist && savedSongs.length > 0 && !draft && (
            <>
              <Link href={`/dashboard/rehearse/stage/${encodeURIComponent(gig.id)}/${encodeURIComponent(savedSetlist.id)}?from=gig`} className="workspace-primary w-auto">
                <ListMusic aria-hidden="true" className="size-4" /> Open Stage View
              </Link>
              <Link href={`/dashboard/rehearse/${encodeURIComponent(savedSetlist.id)}?gigId=${encodeURIComponent(gig.id)}`} className="workspace-secondary">
                <Play aria-hidden="true" className="size-4" /> Rehearse With AR
              </Link>
            </>
          )}
          <a href={buildWhatsAppUrl(formatGigCallSheet(gig))} target="_blank" rel="noopener noreferrer" className="workspace-secondary">
            <MessageCircle aria-hidden="true" className="size-4" /> Share Call Sheet
          </a>
        </div>
      </header>

      <div className={`grid items-start gap-4 ${isAdmin ? "lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]" : ""}`}>
        <section className="workspace-panel space-y-4" aria-labelledby="setlist-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="setlist-title" className="text-lg font-semibold">Gig Setlist</h2>
            <span className="text-sm text-zinc-400">{songs.length} {songs.length === 1 ? "song" : "songs"}</span>
          </div>
          {isAdmin && songs.length > 1 && (
            <p className="text-sm text-zinc-400">Drag the handles or use the arrow buttons to move songs. Save the order when you’re done.</p>
          )}
          {draft && (
            <div className="space-y-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3">
              <p role={saveStatus === "error" ? "alert" : "status"} className="text-sm">
                {saveStatus === "error" ? "Could not save the order. Retry or discard your changes." : pending === "order" ? "Saving order…" : "Save or discard your new order before adding or removing songs."}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="workspace-primary" disabled={busy} onClick={() => void saveOrder()}>{pending === "order" ? "Saving…" : saveStatus === "error" ? "Retry Save" : "Save Order"}</button>
                <button type="button" className="workspace-secondary" disabled={busy} onClick={() => {
                  setDraft(null);
                  setSaveStatus("idle");
                }}>Discard Changes</button>
              </div>
            </div>
          )}
          {saveStatus === "saved" && <p role="status" className="text-sm text-emerald-300">Order Saved.</p>}
          {songs.length === 0 ? (
            <div className="space-y-2 py-6 text-center">
              <Music aria-hidden="true" className="mx-auto size-7 text-indigo-300" />
              <p className="font-medium">No Songs In This Setlist Yet</p>
              <p className="text-sm text-zinc-400">{isAdmin ? "Add songs from your band’s repertoire." : "Songs will appear here when a band admin adds them."}</p>
            </div>
          ) : (
            <Reorder.Group as="ol" axis="y" values={songs} onReorder={reorder} className="space-y-2">
              {songs.map((item, index) => (
                <SetlistRow key={item.id} item={item} index={index} canEdit={isAdmin} busy={busy} allowRemove={!draft} first={index === 0} last={index === songs.length - 1} onMove={(offset) => move(index, offset)} onRemove={() => void removeSong(item.id)} onNotes={() => setViewing(item.song)} />
              ))}
            </Reorder.Group>
          )}
        </section>

        {isAdmin && (
          <section className="workspace-panel space-y-4" aria-labelledby="setlist-picker-title">
            <h2 id="setlist-picker-title" className="text-lg font-semibold">Add From Repertoire</h2>
            {availableSongs.length === 0 ? (
              <p className="text-sm text-zinc-400">Your repertoire is empty. <Link href="/dashboard/repertoire" className="text-indigo-300 underline">Add Songs To The Repertoire</Link></p>
            ) : available.length === 0 ? (
              <p className="text-sm text-zinc-400">All repertoire songs are in the setlist.</p>
            ) : (
              <>
                <label className="grid gap-2 text-sm font-medium">
                  <span>Find A Song</span>
                  <input className="workspace-input" type="search" placeholder="Title or artist" value={query} onChange={(event) => setQuery(event.target.value)} />
                </label>
                <p role="status" className="text-sm text-zinc-400">{matches.length === 0 ? "No matching songs." : `${matches.length} ${matches.length === 1 ? "song" : "songs"} available`}</p>
                <ul className="workspace-nav max-h-[28rem] divide-y divide-zinc-800 overflow-y-auto">
                  {matches.map((song) => (
                    <li key={song.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium">{song.title}</p>
                        {song.artist && <p className="break-words text-xs text-zinc-400">{song.artist}</p>}
                      </div>
                      <button type="button" disabled={busy || Boolean(draft)} onClick={() => void addSong(song.id)} aria-label={pending === song.id ? `Adding ${song.title}` : `Add ${song.title} to setlist`} className="workspace-icon-button bg-indigo-500/15 text-indigo-200"><Plus aria-hidden="true" className="size-5" /></button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
      </div>
      {viewing && (
        <WorkspaceDialog title={`Rehearsal Notes · ${viewing.title}`} busy={false} wide onDismiss={() => setViewing(undefined)}>
          <SongRehearsalDetails song={viewing} />
        </WorkspaceDialog>
      )}
    </div>
  );
}
