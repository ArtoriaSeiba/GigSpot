"use client";

import { useEffect, useState } from "react";
import { Loader2, CalendarPlus, CheckSquare, Music2, Briefcase, Bell, X, Calendar, MapPin, ArrowRight, Users, Plus } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { CreateBandForm } from "@/components/create-band-form";

export default function OverviewDashboard() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedNotifs, setDismissedNotifs] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isCreateBandModalOpen, setIsCreateBandModalOpen] = useState(false);



  const fetchOverview = async () => {
    try {
      const res = await fetch("/api/dashboard/overview");
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchOverview();
  }, []);

  const dismissNotification = async (notifId: string) => {
    try {
      const newDismissed = [...dismissedNotifs, notifId];
      setDismissedNotifs(newDismissed);
      
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifId })
      });
    } catch (e) {
      console.error("Failed to dismiss notification", e);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade-in relative px-2">
      {/* Notifications Area */}
      <div className="space-y-4">
        {mounted && (
          <AnimatePresence>
            {data?.notifications?.filter((n: any) => !dismissedNotifs.includes(n.id)).map((notif: any) => (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                key={notif.id} className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-4 items-start relative group"
              >
                <Bell className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div className="pr-8">
                  <h3 className="text-amber-100 font-bold text-sm">{notif.title}</h3>
                  <p className="text-amber-200/70 text-sm mt-1">{notif.message}</p>
                </div>
                <button 
                  onClick={() => dismissNotification(notif.id)}
                  className="absolute top-4 right-4 text-amber-500/50 hover:text-amber-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {!data?.hasBand && data?.myInvites?.length === 0 && (
        <CreateBandForm />
      )}

      {data?.hasBand && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          
          {/* HERO NEXT GIG CARD */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-8">
            <div className="glass-card rounded-[2rem] p-6 md:p-10 border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-zinc-950/50 to-zinc-950/80 relative overflow-hidden h-full flex flex-col justify-center min-h-[280px]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none -z-10" />
              
              {data.nextGigs?.length > 0 ? (
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" /> Next Upcoming Gig
                      </div>
                      <span className="text-zinc-500 text-sm font-medium">{data.nextGigs[0].band.name}</span>
                    </div>
                    <h2 className="text-3xl lg:text-5xl font-black text-white mb-4 lg:mb-6 tracking-tight leading-tight">{data.nextGigs[0].title}</h2>
                    <div className="flex flex-wrap items-center gap-3 lg:gap-6 text-zinc-300">
                      <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-xl">
                        <Calendar className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-400"/> 
                        <span className="font-medium text-sm lg:text-base">{new Date(data.nextGigs[0].date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-black/20 px-4 py-2 rounded-xl">
                        <MapPin className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400"/> 
                        <span className="font-medium text-sm lg:text-base">{data.nextGigs[0].venue}</span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/dashboard/gigs/${data.nextGigs[0].id}`} className="shrink-0 w-full lg:w-auto justify-center px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3 hover:scale-105 active:scale-95">
                    Manage Gig <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center opacity-50 py-12 relative z-10">
                  <CalendarPlus className="w-16 h-16 text-zinc-600 mb-4" />
                  <p className="text-xl font-bold text-zinc-300 mb-2">No upcoming gigs</p>
                  <p className="text-sm text-zinc-500">Book a show to see it featured here.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* HIGH-LEVEL STATS GRID */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-4 grid grid-cols-2 gap-4 md:gap-6">
            <div className="glass-card rounded-[2rem] p-4 md:p-6 border border-zinc-800/80 hover:border-emerald-500/30 transition-colors flex flex-col justify-center items-center text-center group">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <CheckSquare className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <p className="text-3xl md:text-4xl font-black text-white mb-1">{data.totalStats.members}</p>
              <p className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-widest">Members</p>
            </div>
            <div className="glass-card rounded-[2rem] p-4 md:p-6 border border-zinc-800/80 hover:border-cyan-500/30 transition-colors flex flex-col justify-center items-center text-center group">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Music2 className="w-6 h-6 md:w-7 md:h-7" />
              </div>
              <p className="text-3xl md:text-4xl font-black text-white mb-1">{data.totalStats.songs}</p>
              <p className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-widest">Songs</p>
            </div>
            <div className="glass-card rounded-[2rem] p-4 md:p-6 border border-zinc-800/80 hover:border-amber-500/30 transition-colors flex flex-col justify-center items-center text-center group col-span-2">
              <div className="flex items-center gap-4 w-full justify-center md:justify-start">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <div className="text-left">
                  <p className="text-2xl md:text-3xl font-black text-white">{data.totalStats.gear}</p>
                  <p className="text-zinc-500 text-[10px] md:text-xs font-bold uppercase tracking-widest">Gear Items Managed</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* PENDING TASKS */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-8 glass-card rounded-[2rem] p-5 md:p-8 border border-zinc-800/80">
             <div className="flex items-center justify-between mb-4 md:mb-6">
               <h3 className="text-xl md:text-2xl font-black text-white">Pending Tasks</h3>
               <Link href="/dashboard/tasks" className="text-sm text-indigo-400 hover:text-indigo-300 font-bold transition-colors flex items-center gap-1">
                 View All <ArrowRight className="w-4 h-4" />
               </Link>
             </div>
             <div className="space-y-4">
                {data.recentTasks?.length === 0 && (
                  <div className="p-8 text-center bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-700">
                    <p className="text-zinc-400 font-medium">All caught up! No pending tasks.</p>
                  </div>
                )}
                {data.recentTasks?.map((task: any) => (
                  <div key={task.id} className="flex flex-col gap-3 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 hover:bg-zinc-900/60 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-2.5 h-2.5 mt-1.5 rounded-full shrink-0 ${task.status === 'IN_PROGRESS' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-zinc-600'}`} />
                        <span className="text-base text-zinc-200 font-bold leading-tight">{task.title}</span>
                      </div>
                      <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 border ${task.status === 'IN_PROGRESS' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50'}`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pl-6">
                      <span className="text-[11px] sm:text-xs text-zinc-500 bg-black/20 px-2 py-1 rounded-md font-medium w-fit">
                        {task.band.name}
                      </span>
                      {task.assignedName && (
                        <span className="text-[11px] sm:text-xs text-zinc-500 truncate">
                          Assigned: {task.assignedName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
             </div>
          </motion.div>
          
          {/* MY BANDS */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="hidden lg:flex lg:col-span-4 glass-card rounded-[2rem] p-5 md:p-8 border border-zinc-800/80 flex-col relative overflow-hidden self-start">
             <div className="flex items-center justify-between mb-6 relative z-10">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 md:w-7 md:h-7" />
                 </div>
                 <h3 className="text-xl md:text-2xl font-black text-white">My Bands</h3>
               </div>
               <button onClick={() => setIsCreateBandModalOpen(true)} className="p-3 glass text-indigo-300 hover:text-white rounded-xl transition-all border border-indigo-500/20 hover:border-indigo-400/50 hover:bg-indigo-500/20">
                 <Plus className="w-5 h-5" />
               </button>
             </div>
             
             <div className="space-y-3 flex-1 relative z-10">
               {data.bands?.map((b: any) => (
                 <div key={b.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800/50 transition-colors group">
                    <div>
                      <span className="text-base font-bold text-zinc-200 group-hover:text-white transition-colors block">{b.name}</span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5"><Users className="w-3 h-3" /> {b.memberCount} member{b.memberCount !== 1 && 's'}</span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-400 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded-lg uppercase tracking-wider">{b.role}</span>
                 </div>
               ))}
             </div>
          </motion.div>
        </div>
      )}

      {/* Create Band Modal */}
      <AnimatePresence>
        {isCreateBandModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl"
            >
              <CreateBandForm onCancel={() => setIsCreateBandModalOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


