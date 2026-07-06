import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Calendar, Guitar, Users, Settings, Briefcase, User, DollarSign, CheckSquare, LayoutDashboard, PlayCircle, Image as ImageIcon } from "lucide-react";
import { PrismaClient } from "@prisma/client";
import { LogoutButton } from "@/components/logout-button";
import { BandSwitcher } from "@/components/band-switcher";
import { GlobalAlerts } from "@/components/global-alerts";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const activeBandId = cookieStore.get("activeBandId")?.value;

  let bandRole = "MUSICIAN";
  if (session.user?.id) {
    const whereClause: any = { userId: session.user.id };
    if (activeBandId) whereClause.bandId = activeBandId;
    
    const bandMember = await prisma.bandMember.findFirst({
      where: whereClause
    });
    if (bandMember) bandRole = bandMember.bandRole;
  }

  return (
    <div className="flex flex-col xl:flex-row h-[100dvh] overflow-hidden bg-zinc-950">
      <MobileSidebar user={{ name: session.user?.name }} bandRole={bandRole} />
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 glass border-r border-zinc-800/50 hidden xl:flex flex-col relative z-20">
        <div className="p-6">
          <Link href="/dashboard" className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            GigSpot.
          </Link>
          <BandSwitcher />
        </div>
        
        <nav className="flex-1 px-4 space-y-6 mt-4 overflow-y-auto scrollbar-hide">
          <div className="space-y-2">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group">
              <LayoutDashboard className="w-5 h-5 group-hover:text-amber-400 transition-colors" />
              <span className="font-medium text-sm">Dashboard Overview</span>
            </Link>
          </div>

          <div className="space-y-2">
            <h3 className="px-3 text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">Band Workspace</h3>
            <Link href="/dashboard/gigs" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group">
              <Calendar className="w-5 h-5 group-hover:text-indigo-400 transition-colors" />
              <span className="font-medium text-sm">Gigs & Schedules</span>
            </Link>
            <Link href="/dashboard/band" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group">
              <Users className="w-5 h-5 group-hover:text-emerald-400 transition-colors" />
              <span className="font-medium text-sm">Band Members</span>
            </Link>
            <Link href="/dashboard/band-profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group">
              <Settings className="w-5 h-5 group-hover:text-pink-400 transition-colors" />
              <span className="font-medium text-sm">Band Profile</span>
            </Link>
            <Link href="/dashboard/repertoire" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group">
              <Guitar className="w-5 h-5 group-hover:text-cyan-400 transition-colors" />
              <span className="font-medium text-sm">Master Repertoire</span>
            </Link>
            <Link href="/dashboard/gear" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group">
              <Briefcase className="w-5 h-5 group-hover:text-amber-400 transition-colors" />
              <span className="font-medium text-sm">Gear Inventory</span>
            </Link>
            <Link href="/dashboard/finances" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group">
              <DollarSign className="w-5 h-5 group-hover:text-emerald-400 transition-colors" />
              <span className="font-medium text-sm">Finances</span>
            </Link>
            <Link href="/dashboard/tasks" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group">
              <CheckSquare className="w-5 h-5 group-hover:text-indigo-400 transition-colors" />
              <span className="font-medium text-sm">Task Board</span>
            </Link>
          </div>

          <div className="space-y-2">
            <h3 className="px-3 text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">Personal</h3>
            <Link href="/dashboard/rehearse" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group">
              <PlayCircle className="w-5 h-5 group-hover:text-cyan-400 transition-colors" />
              <span className="font-medium text-sm">Launch AR Practice</span>
            </Link>
            <Link href="/dashboard/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group">
              <User className="w-5 h-5 group-hover:text-zinc-200 transition-colors" />
              <span className="font-medium text-sm">My Profile</span>
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-800/50 bg-black/20">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50 shrink-0">
                <span className="text-indigo-400 text-xs font-bold">{session.user?.name?.charAt(0) || "U"}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-zinc-200 truncate">{session.user?.name}</p>
                <p className="text-xs text-zinc-500 truncate">{bandRole}</p>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative p-4 md:p-8">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
        <div className="min-h-full max-w-6xl mx-auto w-full">
          <GlobalAlerts />
          {children}
        </div>
      </main>
    </div>
  );
}
