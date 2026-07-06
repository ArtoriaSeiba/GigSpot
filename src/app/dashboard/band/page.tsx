"use client";

import { useState, useEffect } from "react";
import { Users, Mail, Loader2, X, ShieldAlert, Trash2, CheckCircle2, Settings, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

type Member = {
  id: string;
  userId: string;
  bandRole: "ADMIN" | "MUSICIAN";
  user: {
    name: string | null;
    email: string | null;
  };
};

type PendingInvite = {
  id: string;
  email: string;
  role: "ADMIN" | "MUSICIAN";
};

export default function BandManagementPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [bandRole, setBandRole] = useState("MUSICIAN");

  // Form State
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MUSICIAN");
  const [isSubmitting, setIsSubmitting] = useState(false);



  const fetchMembers = async () => {
    try {
      const roleRes = await fetch("/api/band/role");
      if (roleRes.ok) {
        const { role } = await roleRes.json();
        setBandRole(role);
      }

      const res = await fetch("/api/band/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(Array.isArray(data.members) ? data.members : []);
        setPendingInvites(Array.isArray(data.pendingInvites) ? data.pendingInvites : []);
      } else if (res.status === 403) {
        setError("You do not have permission to view this page. Admins only.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/band/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchMembers();
        setEmail(""); setRole("MUSICIAN");
        toast.success("Invite sent successfully!");
      } else {
        toast.error(data.error || "Failed to invite user");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      const res = await fetch("/api/band/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        fetchMembers();
        toast.success("Member removed successfully");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to remove member");
      }
    } catch (e) {
      toast.error("An error occurred");
    }
  };



  const cancelInvite = async (inviteId: string) => {
    if (!confirm("Cancel this pending invite?")) return;
    try {
      const res = await fetch("/api/band/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId }),
      });
      if (res.ok) fetchMembers();
    } catch (e) {
      console.error(e);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }

  if (error && members.length === 0) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-zinc-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Band Team</h1>
          <p className="hidden md:block text-zinc-400 text-sm">Manage who has access to your band's schedule, gear, and repertoire.</p>
        </div>
        {bandRole === "ADMIN" && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Mail className="w-5 h-5" />
            Invite Member
          </button>
        )}
      </header>

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">{success}</span>
        </div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-card rounded-3xl p-4 md:p-6"
      >
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                <th className="pb-4 font-medium pl-2">Name</th>
                <th className="pb-4 font-medium">Email</th>
                <th className="pb-4 font-medium">Role</th>
                {bandRole === "ADMIN" && <th className="pb-4 font-medium text-right pr-2">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              <AnimatePresence>
                {members.map((member, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                    key={member.id} 
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="py-4 pl-2 font-bold text-zinc-200">
                      {member.user.name || "Unknown Musician"}
                  </td>
                  <td className="py-4 text-zinc-400">{member.user.email}</td>
                  <td className="py-4">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold tracking-wider ${
                      member.bandRole === "ADMIN" 
                        ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                        : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    }`}>
                      {member.bandRole}
                    </span>
                  </td>
                  {bandRole === "ADMIN" && (
                    <td className="py-4 text-right pr-2">
                      <button onClick={() => handleRemove(member.userId)} className="text-zinc-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-white/5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </motion.tr>
              ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          <AnimatePresence>
            {members.map((member, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                key={member.id} 
                className="flex flex-col p-4 rounded-2xl bg-black/20 hover:bg-black/40 transition-colors border border-zinc-800 gap-3"
              >
                <div>
                  <h4 className="font-bold text-zinc-200 text-lg leading-tight">{member.user.name || "Unknown Musician"}</h4>
                  <p className="text-sm text-zinc-400 mt-0.5">{member.user.email}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50 mt-1">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold tracking-wider ${
                    member.bandRole === "ADMIN" 
                      ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                      : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  }`}>
                    {member.bandRole}
                  </span>
                  {bandRole === "ADMIN" && (
                    <button onClick={() => handleRemove(member.userId)} className="text-zinc-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {bandRole === "ADMIN" && pendingInvites.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card rounded-3xl p-4 md:p-6"
        >
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Pending Invites</h2>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                  <th className="pb-4 font-medium pl-2">Email</th>
                  <th className="pb-4 font-medium">Role</th>
                  <th className="pb-4 font-medium text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {pendingInvites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-4 pl-2 text-zinc-400">{invite.email}</td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold tracking-wider ${
                        invite.role === "ADMIN" 
                          ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      }`}>
                        {invite.role}
                      </span>
                    </td>
                    <td className="py-4 text-right pr-2">
                      <button onClick={() => cancelInvite(invite.id)} className="text-zinc-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-white/5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex flex-col p-4 rounded-2xl bg-black/20 hover:bg-black/40 transition-colors border border-zinc-800 gap-3">
                <p className="text-sm font-medium text-zinc-300">{invite.email}</p>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50 mt-1">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold tracking-wider ${
                    invite.role === "ADMIN" 
                      ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                      : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  }`}>
                    {invite.role}
                  </span>
                  <button onClick={() => cancelInvite(invite.id)} className="text-zinc-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Invite Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card rounded-3xl w-full max-w-lg p-6 border border-zinc-700/50 shadow-2xl relative">
            <button onClick={() => { setIsModalOpen(false); setError(""); }} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Invite to Band</h2>
            
            <form onSubmit={handleInvite} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none" 
                  placeholder="bandmate@example.com" 
                />
                <p className="text-[11px] text-zinc-500 ml-1 mt-1">If they don't have an account, a pending invite will be created for them.</p>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Access Level</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none [color-scheme:dark]">
                  <option value="MUSICIAN">Musician (Read-Only access to gigs/gear)</option>
                  <option value="ADMIN">Admin (Can schedule gigs & modify gear)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => { setIsModalOpen(false); setError(""); }} className="flex-1 py-3 rounded-xl font-medium text-sm text-zinc-300 glass hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl font-medium text-sm text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
