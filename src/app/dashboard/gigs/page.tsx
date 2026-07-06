"use client";

import { Loader2, Plus, Calendar, MapPin, Clock, MoreVertical, Edit2, Trash2, ArrowRight, CalendarPlus, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type Gig = {
  id: string;
  title: string;
  date: string;
  loadInTime: string | null;
  venue: string;
  notes: string | null;
  income: number | null;
  isPaid?: boolean;
};

type Invite = {
  id: string;
  band: { name: string };
  role: string;
};

export default function DashboardPage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [myInvites, setMyInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGig, setEditingGig] = useState<Gig | null>(null);
  const [error, setError] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [loadInTime, setLoadInTime] = useState("");
  const [venue, setVenue] = useState("");
  const [notes, setNotes] = useState("");
  const [income, setIncome] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [bandRole, setBandRole] = useState("MUSICIAN");

  const openModal = (gig?: Gig) => {
    if (gig) {
      setEditingGig(gig);
      setTitle(gig.title);
      setDate(gig.date.split('T')[0]);
      setLoadInTime(gig.loadInTime ? new Date(gig.loadInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "");
      setVenue(gig.venue);
      setNotes(gig.notes || "");
      setIncome(gig.income ? gig.income.toString() : "");
    } else {
      setEditingGig(null);
      setTitle("");
      setDate("");
      setLoadInTime("");
      setVenue("");
      setNotes("");
      setIncome("");
    }
    setError("");
    setIsModalOpen(true);
  };

  const fetchGigs = async () => {
    try {
      const roleRes = await fetch("/api/band/role");
      if (roleRes.ok) {
        const { role } = await roleRes.json();
        setBandRole(role);
      }
      
      const res = await fetch("/api/gigs");
      const data = await res.json();
      setGigs(Array.isArray(data) ? data : []);
      const invitesRes = await fetch("/api/invites");
      if (invitesRes.ok) {
        setMyInvites(await invitesRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGigs();
  }, []);

  const handleInviteResponse = async (inviteId: string, action: 'accept' | 'decline') => {
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, action })
      });
      if (res.ok) {
        fetchGigs(); // Refresh everything, since they might have joined a band
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateGig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const url = "/api/gigs";
      const method = editingGig ? "PUT" : "POST";
      const body = editingGig
        ? JSON.stringify({ gigId: editingGig.id, title, date, loadInTime: loadInTime ? `${date}T${loadInTime}:00` : null, venue, notes, income })
        : JSON.stringify({ title, date, loadInTime: loadInTime ? `${date}T${loadInTime}:00` : null, venue, notes, income });

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (res.ok) {
        toast.success(editingGig ? "Gig updated!" : "Gig added!");
        setIsModalOpen(false);
        fetchGigs();
      } else {
        const data = await res.json();
        toast.error(data.error || "An error occurred");
        setError(data.error || "An error occurred");
      }
    } catch (e) {
      toast.error("Failed to submit. Check your connection.");
      setError("Failed to submit. Check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGig = async (gigId: string) => {
    if (!confirm("Delete this gig?")) return;
    try {
      const res = await fetch("/api/gigs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gigId })
      });
      if (res.ok) {
        toast.success("Gig deleted");
        fetchGigs();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete gig");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error");
    }
  };

  const handleSyncAll = async () => {
    setIsSyncingAll(true);
    const toastId = toast.loading("Syncing all upcoming gigs...");
    try {
      const res = await fetch("/api/calendar/sync-all", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message, { id: toastId });
      } else {
        toast.error(data.error || "Failed to sync gigs", { id: toastId });
      }
    } catch (e) {
      toast.error("Network error while syncing", { id: toastId });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleReceivePayment = async (gig: Gig) => {
    if (!confirm(`Mark payment of $${gig.income} as received?`)) return;
    const toastId = toast.loading("Recording payment...");
    try {
      const res = await fetch(`/api/gigs/${gig.id}/payment`, {
        method: "POST"
      });
      if (res.ok) {
        toast.success("Payment recorded!", { id: toastId });
        fetchGigs();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed", { id: toastId });
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error", { id: toastId });
    }
  };

  const handleSyncCalendar = async (gig: Gig) => {
    const toastId = toast.loading("Syncing to Google Calendar...");
    try {
      const res = await fetch(`/api/gigs/${gig.id}/calendar`, {
        method: "POST"
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Added to Google Calendar!", { id: toastId });
        if (data.eventUrl) {
          window.open(data.eventUrl, "_blank");
        }
        return;
      }

      if (data.code === "ACCOUNT_NOT_LINKED") {
        toast.error("Not linked to Google. Downloading .ics instead...", { id: toastId });
        
        // Fallback to .ics download
        const gigDate = new Date(gig.date);
        const startDate = gigDate.toISOString().replace(/-|:|\.\d+/g, "");
        const gigEnd = new Date(gigDate.getTime() + 4 * 60 * 60 * 1000); 
        const endDate = gigEnd.toISOString().replace(/-|:|\.\d+/g, "");
        
        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//GigSpot//Band Management//EN
BEGIN:VEVENT
UID:${gig.id}@gigspot.app
DTSTAMP:${startDate}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${gig.title}
LOCATION:${gig.venue}
DESCRIPTION:Load in: ${gig.loadInTime ? new Date(gig.loadInTime).toLocaleTimeString() : 'N/A'}\\nNotes: ${gig.notes || 'None'}
END:VEVENT
END:VCALENDAR`;

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${gig.title.replace(/\s+/g, "_")}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (data.code === "TOKEN_EXPIRED") {
        toast.error("Google session expired. Please sign out and sign back in with Google.", { id: toastId, duration: 5000 });
      } else {
        toast.error(data.error || "Failed to sync calendar", { id: toastId });
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error while syncing", { id: toastId });
    }
  };

  const nextGig = gigs.filter(g => new Date(g.date) >= new Date(new Date().setHours(0,0,0,0)))[0] || null;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in relative">
      <header>
        <h1 className="text-2xl font-bold text-white mb-2">Gigs & Schedules</h1>
        <p className="hidden lg:block text-zinc-400 text-sm">Manage your upcoming performances and view logistical details.</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Gig Highlight */}
            <div className="glass-card rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 md:p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <CalendarPlus className="w-20 h-20 md:w-32 md:h-32 text-indigo-400" />
            </div>
            
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-4 border border-indigo-500/30">
                Next Up
              </span>
              
              {nextGig ? (
                <>
                  <h2 className="text-2xl lg:text-3xl font-extrabold text-white mb-4 lg:mb-6">{nextGig.title}</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-zinc-400 text-sm">
                        <MapPin className="w-4 h-4" />
                        Venue
                      </div>
                      <p className="text-lg font-medium text-white">{nextGig.venue}</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-zinc-400 text-sm">
                        <Clock className="w-4 h-4" />
                        Date & Time
                      </div>
                      <p className="text-lg font-medium text-white">
                        {new Date(nextGig.date).toLocaleDateString()}
                        {nextGig.loadInTime && ` • Load in: ${new Date(nextGig.loadInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    </div>
                  </div>
                  
                  {(nextGig.notes || nextGig.income) && (
                    <div className="mt-6 p-4 rounded-xl bg-black/20 border border-zinc-800">
                      {nextGig.income && (
                        <p className="text-emerald-400 font-bold mb-2">💰 Income: ${nextGig.income}</p>
                      )}
                      {nextGig.notes && (
                        <div>
                          <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mb-1">Logistical Notes</p>
                          <p className="text-zinc-300 text-sm whitespace-pre-wrap">{nextGig.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full">
                    <Link href={`/dashboard/gigs/${nextGig.id}`} className="px-6 py-2.5 bg-white text-zinc-950 font-bold rounded-xl hover:bg-zinc-200 transition-colors text-sm w-full lg:w-auto text-center flex-1 lg:flex-none justify-center">
                      {bandRole === "ADMIN" ? "Manage Setlist" : "View Setlist"}
                    </Link>
                    <button onClick={() => handleSyncCalendar(nextGig)} className="px-6 py-2.5 glass text-white font-medium rounded-xl hover:bg-white/10 transition-colors text-sm border border-zinc-700 w-full lg:w-auto flex-1 lg:flex-none">
                      Sync to Calendar
                    </button>
                    {bandRole === "ADMIN" && (
                      <div className="ml-auto flex gap-2 w-full lg:w-auto justify-end mt-2 lg:mt-0">
                        <button onClick={() => openModal(nextGig)} className="p-2.5 glass text-zinc-300 hover:text-indigo-400 rounded-xl transition-colors border border-zinc-700">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteGig(nextGig.id)} className="p-2.5 glass text-zinc-300 hover:text-red-400 rounded-xl transition-colors border border-zinc-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <h2 className="text-2xl font-bold text-zinc-400 mb-2">No upcoming gigs!</h2>
                  <p className="text-zinc-500 text-sm">Time to hit the practice room or book a new show.</p>
                </div>
              )}
            </div>
          </div>

          {/* All Upcoming Gigs (Moved to main column) */}
          <div className="glass-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">All Upcoming</h3>
            <div className="space-y-3">
              {gigs.filter(g => new Date(g.date) >= new Date(new Date().setHours(0,0,0,0))).length === 0 && <p className="text-sm text-zinc-500">None scheduled</p>}
              <AnimatePresence>
                {gigs.filter(g => new Date(g.date) >= new Date(new Date().setHours(0,0,0,0))).map((gig) => {
                  const d = new Date(gig.date);
                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={gig.id} 
                      className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 group p-3 rounded-2xl bg-zinc-900/30 border border-transparent hover:border-zinc-800/50 hover:bg-zinc-900/50 transition-all"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900/50 flex flex-col items-center justify-center border border-zinc-800 shrink-0">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase">{d.toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-sm font-bold text-white leading-tight">{d.getDate()}</span>
                        </div>
                        <div>
                          <Link href={`/dashboard/gigs/${gig.id}`} className="text-base font-bold text-indigo-300 hover:text-indigo-200 transition-colors block">{gig.title}</Link>
                          <p className="text-sm text-zinc-400">{gig.venue}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 flex-wrap transition-all duration-300 ml-auto mt-2 lg:mt-0">
                        {(gig.income || 0) > 0 && bandRole === "ADMIN" && (
                          <button 
                            onClick={() => !gig.isPaid && handleReceivePayment(gig)}
                            disabled={gig.isPaid}
                            className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full transition-all duration-300 shadow-sm ${
                              gig.isPaid 
                                ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 text-emerald-400 border border-emerald-500/30 cursor-not-allowed shadow-emerald-500/10' 
                                : 'bg-gradient-to-r from-amber-500/20 to-amber-400/10 text-amber-400 border border-amber-500/30 hover:border-amber-400/50 hover:shadow-amber-500/20 cursor-pointer hover:scale-105 active:scale-95'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${gig.isPaid ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
                            {gig.isPaid ? 'Paid' : 'Mark Paid'}
                          </button>
                        )}
                        <Link href={`/dashboard/gigs/${gig.id}`} className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-indigo-300 bg-gradient-to-r from-indigo-500/20 to-indigo-400/10 hover:from-indigo-500/30 hover:to-indigo-400/20 px-3 py-1.5 rounded-full border border-indigo-500/30 hover:border-indigo-400/50 transition-all duration-300 shadow-sm shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:scale-105 active:scale-95">
                          <span>Setlist</span>
                        </Link>
                        
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleSyncCalendar(gig)} 
                            className="text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 p-2 rounded-lg transition-all duration-300"
                            title="Sync to Calendar"
                          >
                            <CalendarPlus className="w-3.5 h-3.5" />
                          </button>
                          {bandRole === "ADMIN" && (
                            <>
                              <button onClick={() => openModal(gig)} className="text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 p-2 rounded-lg transition-all duration-300">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteGig(gig.id)} className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-all duration-300">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {bandRole === "ADMIN" && (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openModal()} 
                    className="w-full flex items-center justify-between p-3 rounded-xl glass hover:bg-white/10 transition-colors border border-transparent hover:border-zinc-700"
                  >
                    <span className="text-sm font-medium text-zinc-300">Schedule New Gig</span>
                    <CalendarPlus className="w-4 h-4 text-indigo-400" />
                  </motion.button>
                )}
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSyncAll}
                  disabled={isSyncingAll}
                  className="w-full flex items-center justify-between p-3 rounded-xl glass hover:bg-white/10 transition-colors border border-transparent hover:border-zinc-700 disabled:opacity-50"
                >
                  <span className="text-sm font-medium text-zinc-300">Sync to Calendar</span>
                  {isSyncingAll ? <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" /> : <CalendarPlus className="w-4 h-4 text-emerald-400" />}
                </motion.button>
                <Link href="/dashboard/rehearse/demo" className="w-full flex items-center justify-between p-3 rounded-xl glass hover:bg-white/10 transition-colors border border-transparent hover:border-zinc-700">
                  <span className="text-sm font-medium text-zinc-300">Launch AR Practice</span>
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </Link>
              </div>
            </div>

            {/* Past Gigs */}
            <div className="glass-card rounded-3xl p-6 mt-6">
              <h3 className="text-lg font-bold text-zinc-400 mb-4">Past Gigs</h3>
              <div className="space-y-4">
                {gigs.filter(g => new Date(g.date) < new Date(new Date().setHours(0,0,0,0))).length === 0 && <p className="text-sm text-zinc-500">No past gigs</p>}
                <AnimatePresence>
                  {gigs.filter(g => new Date(g.date) < new Date(new Date().setHours(0,0,0,0))).map((gig) => {
                    const d = new Date(gig.date);
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={gig.id} 
                        className="flex flex-wrap items-center justify-between gap-4 group p-2 -mx-2 rounded-xl hover:bg-zinc-900/50 transition-colors opacity-80 hover:opacity-100"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-[200px]">
                          <div className="w-12 h-12 rounded-xl bg-zinc-900/50 flex flex-col items-center justify-center border border-zinc-800 shrink-0">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">{d.toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-sm font-bold text-white leading-tight">{d.getDate()}</span>
                          </div>
                          <div>
                            <Link href={`/dashboard/gigs/${gig.id}`} className="text-sm font-bold text-zinc-300 hover:text-indigo-200 transition-colors block">{gig.title}</Link>
                            <p className="text-xs text-zinc-500">{gig.venue}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 flex-wrap transition-all duration-300 lg:translate-x-2 lg:group-hover:translate-x-0 shrink-0 ml-auto mt-2 lg:mt-0">
                          {(gig.income || 0) > 0 && bandRole === "ADMIN" && (
                            <button 
                              onClick={() => !gig.isPaid && handleReceivePayment(gig)}
                              disabled={gig.isPaid}
                              className={`flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full transition-all duration-300 shadow-sm ${
                                gig.isPaid 
                                  ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 text-emerald-400 border border-emerald-500/30 cursor-not-allowed shadow-emerald-500/10' 
                                  : 'bg-gradient-to-r from-amber-500/20 to-amber-400/10 text-amber-400 border border-amber-500/30 hover:border-amber-400/50 hover:shadow-amber-500/20 cursor-pointer hover:scale-105 active:scale-95'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${gig.isPaid ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
                              {gig.isPaid ? 'Paid' : 'Mark Paid'}
                            </button>
                          )}
                          <Link href={`/dashboard/gigs/${gig.id}`} className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-zinc-300 bg-gradient-to-r from-zinc-500/20 to-zinc-400/10 hover:from-zinc-500/30 hover:to-zinc-400/20 px-3 py-1.5 rounded-full border border-zinc-500/30 hover:border-zinc-400/50 transition-all duration-300 shadow-sm shadow-zinc-500/10 hover:shadow-zinc-500/20 hover:scale-105 active:scale-95">
                            <span>Setlist</span>
                          </Link>
                          {bandRole === "ADMIN" && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => openModal(gig)} className="text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10 p-2 rounded-lg transition-all duration-300">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteGig(gig.id)} className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-all duration-300">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Gig Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-card rounded-3xl w-full max-w-lg p-6 border border-zinc-700/50 shadow-2xl relative"
          >
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">{editingGig ? "Edit Gig" : "Schedule New Gig"}</h2>
            
            <form onSubmit={handleCreateGig} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Gig Title</label>
                <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="Summer Indie Fest" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 ml-1">Date</label>
                  <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none [color-scheme:dark]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 ml-1">Load-In Time (Optional)</label>
                  <input type="time" value={loadInTime} onChange={(e) => setLoadInTime(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none [color-scheme:dark]" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Venue</label>
                <input type="text" required value={venue} onChange={(e) => setVenue(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none" placeholder="The Grand Theater" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Expected Income (Optional)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                  <input type="number" step="0.01" value={income} onChange={(e) => setIncome(e.target.value)} className="w-full glass-input rounded-xl pl-8 pr-4 py-2.5 text-sm outline-none" placeholder="0.00" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Logistical Notes</label>
                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none resize-none" placeholder="Parking around the back..." />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-sm text-zinc-300 glass hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingGig ? "Update Gig" : "Save Gig"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
