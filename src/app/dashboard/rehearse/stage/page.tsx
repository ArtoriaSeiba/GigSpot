"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, ListMusic } from "lucide-react";
import { workspaceRequest } from "@/lib/workspace-requests";

type Gig = {
  id: string;
  title: string;
  date: string;
  setlists: { id: string; name: string; songs: { id: string; song: { title: string; key: string | null } }[] }[];
};

type List = { status: "loading" | "error" } | { status: "ready"; gigs: Gig[] };

const formatDate = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium" });

export default function StageSetlistsPage() {
  const [list, setList] = useState<List>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState("");
  const [now] = useState(Date.now);

  useEffect(() => {
    const controller = new AbortController();
    workspaceRequest<Gig[]>("/api/gigs", "Could not load gig setlists.", { signal: controller.signal })
      .then((gigs) => {
        if (!controller.signal.aborted) setList({ status: "ready", gigs });
      })
      .catch(() => {
        if (!controller.signal.aborted) setList({ status: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  const options = list.status === "ready" ? list.gigs.flatMap((gig) => gig.setlists.filter((setlist) => setlist.songs.length > 0).map((setlist) => ({
    href: `/dashboard/rehearse/stage/${encodeURIComponent(gig.id)}/${encodeURIComponent(setlist.id)}`,
    title: gig.title,
    date: new Date(gig.date),
    name: setlist.name,
    songs: setlist.songs,
  }))) : [];
  const groups = [
    { name: "Upcoming Gigs", options: options.filter(({ date }) => date.getTime() >= now) },
    { name: "Past Gigs", options: options.filter(({ date }) => date.getTime() < now).reverse() },
  ];
  const choice = options.find(({ href }) => href === selected) ?? groups[0].options[0] ?? groups[1].options[0];

  return (
    <div className="space-y-5">
      <Link href="/dashboard/rehearse" className="inline-flex min-h-10 items-center gap-2 text-sm text-zinc-300 hover:text-white">
        <ArrowLeft aria-hidden="true" className="size-4" /> Rehearse
      </Link>
      <header className="workspace-panel workspace-hero workspace-hero-art flex min-h-44 items-center sm:min-h-56">
        <div className="workspace-header relative sm:max-w-[56%]">
          <div>
            <h1 className="flex items-center gap-3">
              <ListMusic aria-hidden="true" className="size-6 shrink-0 text-violet-200 sm:size-7" />
              Stage View
            </h1>
            <p className="max-w-sm pl-9 sm:pl-10">Open your setlist for a rehearsal run-through or a live performance.</p>
          </div>
        </div>
      </header>
      <section className="workspace-panel space-y-4" aria-label="Gig Setlists">
        {list.status === "loading" && <p role="status" className="text-sm text-zinc-300">Loading Setlists…</p>}
        {list.status === "error" && (
          <>
            <p role="alert">Could not load gig setlists.</p>
            <button type="button" className="workspace-secondary" onClick={() => {
              setList({ status: "loading" });
              setAttempt((current) => current + 1);
            }}>Try Again</button>
          </>
        )}
        {list.status === "ready" && (choice ? (
          <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-7">
            <div className="min-w-0 space-y-4">
              <label className="grid gap-2 text-sm font-medium">
                Gig Setlist
                <select className="workspace-input truncate" value={choice.href} onChange={(event) => setSelected(event.target.value)}>
                  {groups.filter((group) => group.options.length).map((group) => (
                    <optgroup key={group.name} label={group.name}>
                      {group.options.map((option) => (
                        <option key={option.href} value={option.href}>{option.title} · {formatDate.format(option.date)} · {option.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <div className="workspace-row space-y-3 rounded-2xl border p-4 sm:p-5">
                <p className="flex items-center gap-2 text-sm text-zinc-300">
                  <CalendarDays aria-hidden="true" className="size-4 text-violet-200" /> {formatDate.format(choice.date)}
                </p>
                <div>
                  <h2 className="wrap-break-word text-xl font-bold tracking-tight sm:text-2xl">{choice.title}</h2>
                  <p className="mt-1 wrap-break-word text-sm text-zinc-400">{choice.name}</p>
                </div>
                <Link href={choice.href} className="workspace-primary min-h-12">
                  Open Stage View <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex min-h-6 flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">Setlist Preview</h2>
                <p className="text-xs tabular-nums text-zinc-400">{choice.songs.length} {choice.songs.length === 1 ? "song" : "songs"}</p>
              </div>
              <ol className="workspace-row divide-y divide-white/8 rounded-2xl border px-4">
                {choice.songs.slice(0, 5).map(({ id, song }, index) => (
                  <li key={id} className="flex items-start gap-3 py-3 text-sm">
                    <span aria-hidden="true" className="w-5 shrink-0 tabular-nums text-violet-200">{index + 1}</span>
                    <span className="min-w-0 flex-1 wrap-break-word font-medium">{song.title}</span>
                    {song.key && <span className="max-w-[35%] wrap-break-word text-xs text-zinc-400">{song.key}</span>}
                  </li>
                ))}
              </ol>
              {choice.songs.length > 5 && <p className="text-xs text-zinc-400">+{choice.songs.length - 5} more in Stage View</p>}
            </div>
          </div>
        ) : (
          <>
            <ListMusic aria-hidden="true" className="size-7 text-violet-200" />
            <div>
              <h2 className="font-semibold">No Setlists With Songs</h2>
              <p className="mt-1 text-sm text-zinc-400">Stage View becomes available once a gig has songs in its setlist.</p>
            </div>
            <Link href="/dashboard/gigs" className="workspace-secondary">Open Gigs</Link>
          </>
        ))}
      </section>
    </div>
  );
}
