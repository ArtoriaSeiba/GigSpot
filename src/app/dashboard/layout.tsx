import { getServerSession } from "next-auth";
import { bandRoleLabel } from "@/lib/utils";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { GigSpotBrand } from "@/components/gigspot-brand";
import { DashboardNav } from "@/components/dashboard-nav";
import { getBandContext } from "@/lib/band-context";
import { LogoutButton } from "@/components/logout-button";
import { BandSwitcher } from "@/components/band-switcher";
import { GlobalAlerts } from "@/components/global-alerts";
import { MobileSidebar } from "@/components/mobile-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const activeBand = session.user?.id ? await getBandContext(session.user.id) : null;
  const bandRole = activeBand?.bandRole ?? "MUSICIAN";
  const currentBandId = activeBand?.bandId ?? null;

  return (
    <div className="flex flex-col xl:flex-row h-[100dvh] overflow-hidden workspace-shell">
      <MobileSidebar user={{ name: session.user?.name }} bandRole={bandRole} activeBandId={currentBandId} />
      {/* Sidebar Navigation */}
      <aside className="workspace-rail relative z-20 hidden w-58 shrink-0 flex-col border-r xl:flex">
        <div className="px-4 pt-5 pb-2">
          <GigSpotBrand href="/dashboard" className="mb-3" />
          <BandSwitcher activeBandId={currentBandId} />
        </div>

        <DashboardNav />

        <div className="border-t border-white/8 p-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-violet-300/25 bg-violet-400/10">
                <span className="text-xs font-bold text-violet-200">{session.user?.name?.charAt(0) || "U"}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-zinc-200 truncate">{session.user?.name}</p>
                <p className="truncate text-xs text-zinc-400">{bandRoleLabel(bandRole)}</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="workspace-nav min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto min-h-full w-full max-w-[76rem] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
          <GlobalAlerts />
          {children}
        </div>
      </main>
    </div>
  );
}
