"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Calendar, Guitar, Users, Settings, Briefcase, User, DollarSign, CheckSquare, LayoutDashboard, PlayCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BandSwitcher } from "@/components/band-switcher";
import { LogoutButton } from "@/components/logout-button";
import { usePathname } from "next/navigation";

interface MobileSidebarProps {
  user: {
    name?: string | null;
  };
  bandRole: string;
}

export function MobileSidebar({ user, bandRole }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      <div className="xl:hidden flex items-center justify-between p-4 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50 sticky top-0 z-40">
        <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          GigSpot.
        </Link>
        <button onClick={() => setIsOpen(true)} className="p-2 text-zinc-400 hover:text-white transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSidebar}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 xl:hidden"
            />
            
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.4 }}
              className="fixed top-0 right-0 bottom-0 w-[280px] bg-zinc-950 border-l border-zinc-800/50 z-50 flex flex-col xl:hidden shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-zinc-800/50">
                <span className="font-bold text-white">Menu</span>
                <button onClick={closeSidebar} className="p-2 text-zinc-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b border-zinc-800/50">
                <BandSwitcher />
              </div>

              <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto scrollbar-hide">
                <div className="space-y-1">
                  <Link onClick={closeSidebar} href="/dashboard" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname === '/dashboard' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="font-medium text-sm">Dashboard Overview</span>
                  </Link>
                </div>

                <div className="space-y-1">
                  <h3 className="px-3 text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">Band Workspace</h3>
                  <Link onClick={closeSidebar} href="/dashboard/gigs" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname.includes('/gigs') ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium text-sm">Gigs & Schedules</span>
                  </Link>
                  <Link onClick={closeSidebar} href="/dashboard/band" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname === '/dashboard/band' ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                    <Users className="w-5 h-5" />
                    <span className="font-medium text-sm">Band Members</span>
                  </Link>
                  <Link onClick={closeSidebar} href="/dashboard/band-profile" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname.includes('/band-profile') ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                    <Settings className="w-5 h-5" />
                    <span className="font-medium text-sm">Band Profile</span>
                  </Link>
                  <Link onClick={closeSidebar} href="/dashboard/repertoire" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname.includes('/repertoire') ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                    <Guitar className="w-5 h-5" />
                    <span className="font-medium text-sm">Master Repertoire</span>
                  </Link>
                  <Link onClick={closeSidebar} href="/dashboard/gear" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname.includes('/gear') ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                    <Briefcase className="w-5 h-5" />
                    <span className="font-medium text-sm">Gear Inventory</span>
                  </Link>
                  <Link onClick={closeSidebar} href="/dashboard/finances" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname.includes('/finances') ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                    <DollarSign className="w-5 h-5" />
                    <span className="font-medium text-sm">Finances</span>
                  </Link>
                  <Link onClick={closeSidebar} href="/dashboard/tasks" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname.includes('/tasks') ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                    <CheckSquare className="w-5 h-5" />
                    <span className="font-medium text-sm">Task Board</span>
                  </Link>
                </div>

                <div className="space-y-1">
                  <h3 className="px-3 text-xs font-bold text-zinc-600 uppercase tracking-wider mb-2">Personal</h3>
                  <Link onClick={closeSidebar} href="/dashboard/rehearse" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname.includes('/rehearse') ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                    <PlayCircle className="w-5 h-5" />
                    <span className="font-medium text-sm">Launch AR Practice</span>
                  </Link>
                  <Link onClick={closeSidebar} href="/dashboard/profile" className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${pathname.includes('/profile') ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                    <User className="w-5 h-5" />
                    <span className="font-medium text-sm">My Profile</span>
                  </Link>
                </div>
              </nav>

              <div className="p-4 border-t border-zinc-800/50 bg-black/20">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50 shrink-0">
                      <span className="text-indigo-400 text-xs font-bold">{user.name?.charAt(0) || "U"}</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium text-zinc-200 truncate">{user.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate uppercase">{bandRole}</p>
                    </div>
                  </div>
                  <LogoutButton />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
