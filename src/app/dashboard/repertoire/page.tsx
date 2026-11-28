"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Guitar, Music, Pencil, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import toast from "react-hot-toast";
import { WorkspaceDialog } from "@/components/workspace-dialog";
import { SongRehearsalDetails } from "@/components/song-rehearsal-details";
import { matchesSongSearch, workspaceErrorMessage, workspaceMutation, workspaceRequest, type BandRole } from "@/lib/workspace-requests";
import { SongEditor, type RepertoireSong as Song, type SongDraft } from "./song-editor";

type Library =
  | { status: "loading" | "error" | "no-band" }
  | { status: "ready"; songs: Song[]; isAdmin: boolean };

export default function RepertoirePage() {
  const [library, setLibrary] = useState<Library>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Song | null>();
  const [viewing, setViewing] = useState<Song>();
  const [deleting, setDeleting] = useState<Song>();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };

    async function load() {
      try {
        const band = await workspaceRequest<BandRole>("/api/band/role", "Could not load your band.", options);
        if (!band.bandId) {
          if (!controller.signal.aborted) setLibrary({ status: "no-band" });
          return;
        }
        const songs = await workspaceRequest<Song[]>("/api/songs", "Could not load songs.", options);
        if (!controller.signal.aborted) setLibrary({ status: "ready", songs, isAdmin: band.role === "ADMIN" });
      } catch {
        if (!controller.signal.aborted) setLibrary({ status: "error" });
      }
    }

    void load();
    return () => controller.abort();
  }, [attempt]);

  const isAdmin = library.status === "ready" && library.isAdmin;
  const songs = library.status === "ready" ? library.songs : [];
  const results = songs.filter((song) => matchesSongSearch(song, query));

  function openEditor(song: Song | null) {
    setFormError("");
    setEditing(song);
  }

  async function saveSong(draft: SongDraft) {
    if (isSaving) return;
    if (!draft.title.trim()) {
      setFormError("Enter a song title.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const song = await workspaceMutation<Song>("/api/songs", editing ? "PUT" : "POST", {
        ...(editing && { id: editing.id }),
        ...draft,
      }, "Could not save the song. Please try again.");
      setLibrary((current) => current.status === "ready" ? {
        ...current,
        songs: [...current.songs.filter((item) => item.id !== song.id), song].sort((a, b) => a.title.localeCompare(b.title)),
      } : current);
      toast.success(editing ? "Song updated." : "Song added.");
      setEditing(undefined);
    } catch (error) {
      const message = workspaceErrorMessage(error, "Could not save the song. Please try again.");
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteSong(song: Song) {
    if (isSaving) return;
    setIsSaving(true);
    setFormError("");
    try {
      await workspaceMutation("/api/songs", "DELETE", { id: song.id }, "Could not delete the song.");
      setLibrary((current) => current.status === "ready" ? {
        ...current,
        songs: current.songs.filter((item) => item.id !== song.id),
      } : current);
      setDeleting(undefined);
      toast.success("Song deleted.");
    } catch (error) {
      const message = workspaceErrorMessage(error, "Could not delete the song. Please try again.");
      setFormError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="workspace-header">
        <div>
          <h1>Repertoire</h1>
          <p>Browse your band’s songs, keys, and tempos.</p>
        </div>
        {isAdmin && <button type="button" className="workspace-primary shrink-0" onClick={() => openEditor(null)}><Plus aria-hidden="true" className="size-5" /> Add Song</button>}
      </header>

      <section className="workspace-panel space-y-4" aria-label="Band Songs">
        {library.status === "loading" && <p role="status" className="text-sm text-zinc-400">Loading Repertoire…</p>}
        {library.status === "error" && (
          <>
            <p role="alert">Could not load your repertoire.</p>
            <button type="button" className="workspace-secondary" onClick={() => {
              setLibrary({ status: "loading" });
              setAttempt((value) => value + 1);
            }}>Try Again</button>
          </>
        )}
        {library.status === "no-band" && (
          <>
            <h2 className="font-semibold">Join Or Create A Band To Use The Repertoire</h2>
            <Link href="/dashboard" className="workspace-secondary">Go To Dashboard</Link>
          </>
        )}
        {library.status === "ready" && songs.length === 0 && (
          <div className="space-y-2 py-6 text-center">
            <Music aria-hidden="true" className="mx-auto size-8 text-indigo-300" />
            <h2 className="text-lg font-semibold">No Songs Yet</h2>
            <p className="text-sm text-zinc-400">{isAdmin ? "Add a song to start your band’s repertoire." : "Songs will appear here when a band admin adds them."}</p>
          </div>
        )}
        {songs.length > 0 && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <label className="grid w-full max-w-sm gap-2 text-sm font-medium">
                <span>Find A Song</span>
                <span className="relative block">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 size-4 text-zinc-400" />
                  <input className="workspace-input pl-9" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title or artist" />
                </span>
              </label>
              <p role="status" className="py-1 text-sm tabular-nums text-zinc-400">{results.length} {results.length === 1 ? "song" : "songs"}{query.trim() && ` of ${songs.length}`}</p>
            </div>
            {results.length === 0 && <p className="text-sm text-zinc-300">No matching songs. Try another title or artist.</p>}
            <ul className="divide-y divide-zinc-800">
              {results.map((song) => (
                <li key={song.id}>
                  <button type="button" aria-haspopup="dialog" aria-label={`View Song Details for ${song.title}`}
                    className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-lg px-2 py-3 text-left transition-colors hover:bg-violet-400/8 sm:grid-cols-[minmax(0,1fr)_minmax(0,auto)_auto]"
                    onClick={() => setViewing(song)}
                  >
                    <span className="min-w-0">
                      <span className="block wrap-break-word font-semibold group-hover:text-violet-100">{song.title}</span>
                      {song.artist && <span className="block wrap-break-word text-sm text-zinc-400">{song.artist}</span>}
                    </span>
                    {(song.key || song.tempo !== null) && (
                      <span className="col-start-1 row-start-2 flex min-w-0 flex-wrap gap-x-3 text-xs tabular-nums text-zinc-400 sm:col-start-2 sm:row-start-1 sm:text-sm">
                        {song.key && <span className="wrap-break-word">Key {song.key}</span>}
                        {song.tempo !== null && <span>{song.tempo} BPM</span>}
                      </span>
                    )}
                    <ChevronRight aria-hidden="true" className="col-start-2 row-start-1 size-5 text-zinc-500 group-hover:text-violet-200 sm:col-start-3" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {editing !== undefined && (
        <WorkspaceDialog title={editing ? "Edit Song" : "Add Song"} busy={isSaving} wide onDismiss={() => setEditing(undefined)}>
          <SongEditor song={editing} busy={isSaving} error={formError} onSave={(draft) => void saveSong(draft)} onCancel={() => setEditing(undefined)} />
        </WorkspaceDialog>
      )}

      {viewing && (
        <WorkspaceDialog title={viewing.title} busy={false} wide onDismiss={() => setViewing(undefined)}>
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
            {viewing.artist && <p className="w-full wrap-break-word text-sm text-zinc-400">{viewing.artist}</p>}
            <Link href={`/dashboard/rehearse/${encodeURIComponent(viewing.id)}`} className="workspace-secondary">
              <Guitar aria-hidden="true" className="size-4" /> Launch AR
            </Link>
            {isAdmin && (
              <>
                <button type="button" className="workspace-secondary" onClick={() => {
                  setViewing(undefined);
                  openEditor(viewing);
                }}><Pencil aria-hidden="true" className="size-4" /> Edit Song</button>
                <button type="button" className="workspace-icon-button ml-auto hover:text-red-300" aria-label="Delete Song" onClick={() => {
                  setViewing(undefined);
                  setFormError("");
                  setDeleting(viewing);
                }}><Trash2 aria-hidden="true" className="size-4" /></button>
              </>
            )}
          </div>
          <SongRehearsalDetails song={viewing} />
        </WorkspaceDialog>
      )}

      {deleting && (
        <WorkspaceDialog title="Delete Song?" busy={isSaving} onDismiss={() => setDeleting(undefined)}>
          <p className="text-sm text-zinc-300"><strong>{deleting.title}</strong> will be removed from the repertoire and all setlists.</p>
          {formError && <p role="alert" className="mt-3 text-sm text-red-300">{formError}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" className="workspace-secondary" disabled={isSaving} onClick={() => setDeleting(undefined)}>Cancel</button>
            <button type="button" className="workspace-danger" disabled={isSaving} onClick={() => void deleteSong(deleting)}>{isSaving ? "Deleting…" : "Delete Song"}</button>
          </div>
        </WorkspaceDialog>
      )}
    </div>
  );
}
