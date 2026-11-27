"use client";

import { useEffect, useState } from "react";
import { bandRoleLabel } from "@/lib/utils";
import { ArrowRight, Briefcase, Calendar, MapPin, Music2, Plus, Users } from "lucide-react";
import Link from "next/link";
import { CreateBandForm } from "@/components/create-band-form";
import { switchActiveBand } from "@/lib/switch-active-band";

const OPEN_TASKS_PAGE_SIZE = 5;
type Overview = {
  hasBand: boolean;
  bands: { id: string; name: string; role: string; memberCount: number }[];
  nextGigs: { id: string; bandId: string; title: string; date: string; venue: string; band: { name: string } }[];
  recentTasks: { id: string; title: string; status: string; assignedName: string | null }[];
  totalStats: { members: number; songs: number; gear: number };
};

type OverviewState =
  | { status: "loading" | "error" }
  | { status: "ready"; data: Overview; activeBandId?: string };

export default function OverviewDashboard() {
  const [overview, setOverview] = useState<OverviewState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [isCreateBandModalOpen, setIsCreateBandModalOpen] = useState(false);
  const [openTasksPage, setOpenTasksPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();
    const options = { signal: controller.signal };

    async function loadOverview() {
      try {
        const [response, roleResponse] = await Promise.all([
          fetch("/api/dashboard/overview", options),
          fetch("/api/band/role", options),
        ]);
        if (!response.ok) throw new Error("Overview request failed");
        const data: Overview = await response.json();
        if (data.hasBand && !roleResponse.ok) throw new Error("Band request failed");
        const activeBand = roleResponse.ok ? await roleResponse.json() as { bandId?: string } : {};
        if (!controller.signal.aborted) {
          setOverview({ status: "ready", data, activeBandId: activeBand.bandId });
        }
      } catch {
        if (!controller.signal.aborted) setOverview({ status: "error" });
      }
    }

    void loadOverview();
    return () => controller.abort();
  }, [attempt]);

  const data = overview.status === "ready" ? overview.data : null;
  const activeBandId = overview.status === "ready" ? overview.activeBandId : undefined;
  const activeBand = data?.bands.find((band) => band.id === activeBandId);
  const nextGig = data?.nextGigs[0];
  const openTasks = data?.recentTasks ?? [];
  const openTaskPages = Math.max(1, Math.ceil(openTasks.length / OPEN_TASKS_PAGE_SIZE));
  const currentTaskPage = Math.min(openTasksPage, openTaskPages);
  const visibleOpenTasks = openTasks.slice((currentTaskPage - 1) * OPEN_TASKS_PAGE_SIZE, currentTaskPage * OPEN_TASKS_PAGE_SIZE);

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="workspace-header">
        <div>
          <h1>Dashboard</h1>
          {activeBand && <p className="flex items-center gap-2"><span aria-hidden="true" className="size-1.5 rounded-full bg-violet-300" />{activeBand.name}</p>}
        </div>
        {data?.hasBand && (
          <Link href="/dashboard/gigs" className="workspace-secondary">
            <Calendar aria-hidden="true" className="size-4 text-violet-300" /> View Schedule
          </Link>
        )}
      </header>

      {overview.status === "loading" && (
        <div role="status">
          <span className="sr-only">Loading Dashboard</span>
          <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
            <div className="workspace-panel h-72" />
            <div className="grid grid-cols-3 gap-3">
              <div className="workspace-panel h-24" /><div className="workspace-panel h-24" /><div className="workspace-panel h-24" />
            </div>
            <div className="workspace-panel h-48" />
          </div>
        </div>
      )}

      {overview.status === "error" && (
        <section className="workspace-panel space-y-3" aria-labelledby="dashboard-error">
          <h2 id="dashboard-error" role="alert" className="text-lg font-semibold">Couldn’t Load The Dashboard</h2>
          <p className="text-sm text-zinc-400">Try loading your gigs and tasks again.</p>
          <button type="button" className="workspace-primary" onClick={() => {
            setOverview({ status: "loading" });
            setAttempt((previous) => previous + 1);
          }}>Try Again</button>
        </section>
      )}

      {data && !data.hasBand && <CreateBandForm />}

      {data?.hasBand && (
        <>
          <section className="workspace-panel workspace-hero workspace-hero-art flex min-h-72 flex-col justify-center p-5 sm:p-8 lg:p-9" aria-labelledby="next-gig">
            <div className="max-w-full space-y-4 sm:max-w-[66%]">
              <h2 id="next-gig" className="workspace-kicker"><span aria-hidden="true" className="size-1.5 rounded-full bg-violet-300" /> Next Gig</h2>
              {nextGig ? (
                <>
                  <div>
                    <h3 className="break-words text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">{nextGig.title}</h3>
                    {nextGig.bandId !== activeBandId && <p className="mt-2 break-words text-sm font-semibold text-violet-200">{nextGig.band.name}</p>}
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-200">
                      <time dateTime={nextGig.date} className="inline-flex items-center gap-2">
                        <Calendar aria-hidden="true" className="size-4 shrink-0 text-violet-300" />
                        {new Date(nextGig.date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                      </time>
                      <span className="flex min-w-0 items-start gap-2">
                        <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-violet-300" />
                        <span className="min-w-0 break-words">{nextGig.venue}</span>
                      </span>
                    </div>
                  </div>
                  {nextGig.bandId === activeBandId ? (
                    <Link href={`/dashboard/gigs/${nextGig.id}`} className="workspace-primary">
                      Open Gig <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  ) : (
                    <button type="button" onClick={() => switchActiveBand(nextGig.bandId, `/dashboard/gigs/${nextGig.id}`)} className="workspace-primary">
                      Switch Band And Open Gig <ArrowRight aria-hidden="true" className="size-4" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">No Upcoming Gigs</h3>
                  <Link href="/dashboard/gigs" className="workspace-primary">View Gigs <ArrowRight aria-hidden="true" className="size-4" /></Link>
                </>
              )}
            </div>
          </section>

          <dl className="grid grid-cols-3 gap-2.5 sm:gap-4" aria-label="Band At A Glance">
            {[
              { label: "Members", value: data.totalStats.members, icon: Users, tone: "bg-violet-400/12 text-violet-200" },
              { label: "Songs", value: data.totalStats.songs, icon: Music2, tone: "bg-cyan-400/10 text-cyan-200" },
              { label: "Gear Items", value: data.totalStats.gear, icon: Briefcase, tone: "bg-amber-400/10 text-amber-200" },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="workspace-panel relative grid gap-2 p-3 sm:gap-1 sm:py-4 sm:pr-4 sm:pl-18">
                <dt className="text-xs font-medium text-zinc-300 sm:text-sm">
                  <span className={`mb-2 grid size-8 place-items-center rounded-lg sm:absolute sm:top-4 sm:left-4 sm:mb-0 sm:size-11 sm:rounded-xl ${tone}`}>
                    <Icon aria-hidden="true" className="size-4 sm:size-5" />
                  </span>
                  {label}
                </dt>
                <dd className="text-xl font-semibold leading-none tabular-nums sm:text-2xl">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-5">
            <section className="workspace-panel" aria-labelledby="dashboard-tasks">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2">
                <h2 id="dashboard-tasks" className="text-lg font-semibold tracking-tight">Open Tasks</h2>
                <Link href="/dashboard/tasks" className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-violet-200 hover:text-white">
                  View Tasks <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
              {openTasks.length === 0 ? (
                <p className="py-3 text-sm text-zinc-400">{activeBand?.role === "ADMIN" ? "No open tasks for this band." : "No open tasks assigned to you in this band."}</p>
              ) : (
                <ul className="space-y-2">
                  {visibleOpenTasks.map((task) => (
                    <li key={task.id} className="workspace-row flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5">
                      <div className="min-w-0 flex-1 basis-36">
                        <p className="break-words text-sm font-semibold">{task.title}</p>
                        {task.assignedName && <p className="mt-0.5 break-words text-xs text-zinc-400">{task.assignedName}</p>}
                      </div>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${task.status === "IN_PROGRESS" ? "bg-cyan-400/10 text-cyan-200" : "bg-white/7 text-zinc-300"}`}>
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                        {task.status === "IN_PROGRESS" ? "In Progress" : "Pending"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {openTaskPages > 1 && (
                <nav aria-label="Open Tasks Pages" className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-3">
                  <button type="button" className="workspace-secondary" disabled={currentTaskPage === 1} onClick={() => setOpenTasksPage(currentTaskPage - 1)}>Previous</button>
                  <span className="px-2 text-sm text-zinc-400">Page {currentTaskPage} of {openTaskPages}</span>
                  <button type="button" className="workspace-secondary" disabled={currentTaskPage === openTaskPages} onClick={() => setOpenTasksPage(currentTaskPage + 1)}>Next</button>
                </nav>
              )}
            </section>

            <section className="workspace-panel" aria-labelledby="my-bands">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="my-bands" className="text-lg font-semibold tracking-tight">My Bands</h2>
                <button type="button" onClick={() => setIsCreateBandModalOpen(true)} aria-label="Create Band" title="Create Band" className="workspace-icon-button border border-violet-400/25 text-violet-200">
                  <Plus aria-hidden="true" className="size-5" />
                </button>
              </div>
              <ul className="space-y-2">
                {data.bands.map((band) => (
                  <li key={band.id} className="workspace-row flex min-w-0 items-center gap-3 rounded-xl border p-3">
                    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-400/12 font-semibold text-violet-200">{band.name.charAt(0).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold">{band.name}</p>
                      <p className="text-xs text-zinc-400">{band.memberCount} {band.memberCount === 1 ? "member" : "members"} · {bandRoleLabel(band.role)}</p>
                    </div>
                    {band.id === activeBandId && <span className="rounded-full bg-violet-400/12 px-2 py-1 text-xs text-violet-200">Active</span>}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}

      {isCreateBandModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4">
          <div className="w-full max-w-xl">
            <CreateBandForm onCancel={() => setIsCreateBandModalOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
