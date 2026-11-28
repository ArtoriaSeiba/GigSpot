import type { ReactNode } from "react";
import { CalendarDays, Guitar, Link2, ListMusic, Music2, Users } from "lucide-react";
import { GigSpotBrand } from "@/components/gigspot-brand";
import { AuthEntrance } from "@/components/auth-entrance";

const previewSongs = [
  { title: "Soundcheck", key: "Am" },
  { title: "Midnight Drive", key: "D" },
  { title: "Final Encore", key: "G" },
];

export function AuthLayout({ title, description, children, registration = false }: {
  title: string; description?: string; children: ReactNode; registration?: boolean;
}) {
  return (
    <AuthEntrance className={`workspace-shell grid min-h-dvh items-center ${registration ? "auth-register p-3 sm:px-8 sm:py-4" : "p-4 sm:p-8 lg:p-10"}`}>
      <div className={`auth-frame mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-(--gig-stroke) shadow-2xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] ${registration ? "" : "lg:min-h-[38rem]"}`}>
        <div className="auth-art workspace-hero flex min-h-16 flex-col justify-between gap-5 px-5 py-3 sm:px-8 lg:p-8 xl:p-10">
          <GigSpotBrand href="/" className="w-fit" />
          <div className="auth-preview hidden flex-1 flex-col justify-center gap-5 lg:flex">
            {registration ? (
              <>
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-zinc-50 xl:text-3xl">Bring Your Band Together</p>
                  <p className="mt-1.5 text-sm text-zinc-300">Create a workspace for your band or join through an invite.</p>
                </div>
                <figure className="workspace-panel space-y-3 shadow-lg">
                  <figcaption className="flex items-center justify-between gap-3 text-sm font-semibold">
                    <span className="flex items-center gap-2"><Users aria-hidden="true" className="size-4 text-violet-200" /> Band Members</span>
                    <span className="text-xs font-medium text-zinc-400">Sample Band</span>
                  </figcaption>
                  <ul className="divide-y divide-white/8 rounded-xl border border-(--gig-stroke) bg-(--gig-surface-deep) px-3">
                    <li className="flex items-center justify-between gap-3 py-2.5 text-sm"><span>Alex · Guitar</span><span className="rounded-md bg-violet-400/12 px-2 py-0.5 text-xs text-violet-200">Admin</span></li>
                    <li className="flex items-center justify-between gap-3 py-2.5 text-sm"><span>Sam · Bass</span><span className="rounded-md bg-violet-400/12 px-2 py-0.5 text-xs text-violet-200">Musician</span></li>
                  </ul>
                  <p className="flex items-center gap-2 text-xs leading-relaxed text-zinc-300"><Link2 aria-hidden="true" className="size-4 shrink-0 text-violet-200" /> Invite bandmates with a shareable link.</p>
                </figure>
              </>
            ) : (
              <>
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-zinc-50 xl:text-3xl">Your Band, In One Place</p>
                  <p className="mt-1.5 text-sm text-zinc-300">Plan the gig, build the setlist, and rehearse together.</p>
                </div>
                <figure className="workspace-panel space-y-3 shadow-lg">
                  <figcaption className="flex items-center justify-between gap-3 text-sm font-semibold">
                    <span className="flex items-center gap-2"><ListMusic aria-hidden="true" className="size-4 text-violet-200" /> Stage View</span>
                    <span className="text-xs font-medium text-zinc-400">Sample Setlist</span>
                  </figcaption>
                  <ol className="divide-y divide-white/8 rounded-xl border border-(--gig-stroke) bg-(--gig-surface-deep) px-3">
                    {previewSongs.map((song, index) => (
                      <li key={song.title} className="flex items-center gap-3 py-2.5 text-sm">
                        <span className="w-5 shrink-0 text-xs tabular-nums text-violet-200">{index + 1}</span>
                        <span className="min-w-0 flex-1">{song.title}</span>
                        <span className="rounded-md bg-violet-400/12 px-2 py-0.5 text-xs font-medium text-violet-200">{song.key}</span>
                      </li>
                    ))}
                  </ol>
                </figure>
                <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-zinc-300">
                  <li className="flex items-center gap-2"><CalendarDays aria-hidden="true" className="size-4 text-violet-200" /> Gig Scheduling</li>
                  <li className="flex items-center gap-2"><Music2 aria-hidden="true" className="size-4 text-violet-200" /> Chord Charts</li>
                  <li className="flex items-center gap-2"><Guitar aria-hidden="true" className="size-4 text-violet-200" /> AR Fretboard</li>
                </ul>
              </>
            )}
          </div>
        </div>
        <div className={`auth-form workspace-rail flex min-w-0 items-center justify-center px-5 lg:border-l ${registration ? "py-4 sm:px-8" : "py-7 sm:px-8 sm:py-10"}`}>
          <section className={`auth-enter w-full max-w-md ${registration ? "space-y-3" : "space-y-5"}`} aria-labelledby="auth-title">
            <header className="auth-heading workspace-header">
              <div>
                <h1 id="auth-title" className="wrap-break-word">{title}</h1>
                {description && <p>{description}</p>}
              </div>
            </header>
            {children}
          </section>
        </div>
      </div>
    </AuthEntrance>
  );
}
