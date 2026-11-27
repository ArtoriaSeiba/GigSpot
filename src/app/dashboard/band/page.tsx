"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  X,
  ShieldAlert,
  Trash2,
  Save,
  Edit2,
  MessageCircle,
  Music
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { BandLinkInvites } from "@/components/band-link-invites";
import { bandRoleLabel, buildWhatsAppUrl } from "@/lib/utils";

type Member = {
  id: string;
  userId: string;
  bandRole: "ADMIN" | "MUSICIAN";
  instrument?: string | null;
  user: {
    name: string | null;
    email: string | null;
    phone?: string | null;
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
  const [bandName, setBandName] = useState("our band");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [bandRole, setBandRole] = useState("MUSICIAN");

  // Edit member State
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editRole, setEditRole] = useState("MUSICIAN");
  const [editInstrument, setEditInstrument] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

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
        if (data.bandName) setBandName(data.bandName);
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
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setIsEditSubmitting(true);
    try {
      const res = await fetch("/api/band/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: editingMember.id,
          role: editRole,
          instrument: editInstrument.trim() || null,
        }),
      });
      if (res.ok) {
        setEditingMember(null);
        fetchMembers();
        toast.success("Member updated");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update member");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsEditSubmitting(false);
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
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse relative">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-zinc-800/50 rounded-lg"></div>
            <div className="hidden lg:block h-4 w-96 bg-zinc-800/50 rounded"></div>
          </div>
          <div className="h-10 w-full lg:w-40 bg-zinc-800/50 rounded-xl"></div>
        </header>

        <div className="glass-card rounded-3xl p-4 md:p-6 border border-zinc-800/50 bg-zinc-900/20">
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/50">
                  <th className="pb-4 pl-2"><div className="h-4 w-24 bg-zinc-800/50 rounded"></div></th>
                  <th className="pb-4"><div className="h-4 w-32 bg-zinc-800/50 rounded"></div></th>
                  <th className="pb-4"><div className="h-4 w-16 bg-zinc-800/50 rounded"></div></th>
                  <th className="pb-4 pr-2"><div className="h-4 w-16 bg-zinc-800/50 rounded ml-auto"></div></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {[1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td className="py-4 pl-2"><div className="h-5 w-32 bg-zinc-800/50 rounded"></div></td>
                    <td className="py-4"><div className="h-4 w-48 bg-zinc-800/30 rounded"></div></td>
                    <td className="py-4"><div className="h-6 w-20 bg-zinc-800/50 rounded-full"></div></td>
                    <td className="py-4 pr-2">
                      <div className="flex justify-end gap-2">
                        <div className="h-8 w-8 bg-zinc-800/50 rounded-lg"></div>
                        <div className="h-8 w-8 bg-zinc-800/50 rounded-lg"></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
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
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in relative">
      <header className="workspace-header">
        <div>
          <h1>Band Team</h1>
          <p>Manage your band members, instruments, and invite links.</p>
        </div>
        {bandRole === "ADMIN" && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full lg:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
          >
            <MessageCircle className="w-5 h-5" />
            Invite Member
          </button>
        )}
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-card rounded-3xl p-4 md:p-6"
      >
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                <th className="pb-4 font-medium pl-2">Name</th>
                <th className="pb-4 font-medium">Instrument</th>
                <th className="pb-4 font-medium">Contact</th>
                <th className="pb-4 font-medium">Role</th>
                <th className="pb-4 font-medium text-right pr-2">Actions</th>
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
                    <td className="py-4">
                      {member.instrument ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 text-zinc-200 text-xs font-medium border border-zinc-700/60">
                          <Music className="w-3 h-3 text-cyan-400" />
                          {member.instrument}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500 italic">Not Set</span>
                      )}
                    </td>
                    <td className="py-4 text-zinc-400 text-sm">
                      <div>{member.user.email}</div>
                      {member.user.phone && (
                        <div className="text-xs text-emerald-400/90 mt-0.5">{member.user.phone}</div>
                      )}
                    </td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold tracking-wider ${
                        member.bandRole === "ADMIN"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                      }`}>
                        {bandRoleLabel(member.bandRole)}
                      </span>
                    </td>
                    <td className="py-4 text-right pr-2">
                      <div className="inline-flex items-center gap-1">
                        {member.user.phone && (
                          <a
                            href={buildWhatsAppUrl(`Hey ${member.user.name || ""}!`, member.user.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Message On WhatsApp"
                            className="text-emerald-400 hover:text-emerald-300 transition-colors p-2 rounded-lg hover:bg-emerald-500/10"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        {bandRole === "ADMIN" && (
                          <>
                            <button
                              onClick={() => {
                                setEditingMember(member);
                                setEditRole(member.bandRole);
                                setEditInstrument(member.instrument || "");
                              }}
                              title="Edit Member"
                              className="text-zinc-500 hover:text-indigo-400 transition-colors p-2 rounded-lg hover:bg-white/5"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemove(member.userId)}
                              title="Remove Member"
                              className="text-zinc-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-white/5"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          <AnimatePresence>
            {members.map((member, i) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                key={member.id}
                className="flex flex-col p-4 rounded-2xl bg-black/20 hover:bg-black/40 transition-colors border border-zinc-800 gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-zinc-200 text-lg leading-tight">{member.user.name || "Unknown Musician"}</h4>
                    <p className="text-sm text-zinc-400 mt-0.5">{member.user.email}</p>
                    {member.user.phone && (
                      <p className="text-xs text-emerald-400 mt-0.5">{member.user.phone}</p>
                    )}
                  </div>
                  {member.instrument && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800/80 text-zinc-200 text-xs font-medium border border-zinc-700/60 shrink-0">
                      <Music className="w-3 h-3 text-cyan-400" />
                      {member.instrument}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50 mt-1">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold tracking-wider ${
                    member.bandRole === "ADMIN"
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  }`}>
                    {bandRoleLabel(member.bandRole)}
                  </span>
                  <div className="flex gap-1">
                    {member.user.phone && (
                      <a
                        href={buildWhatsAppUrl(`Hey ${member.user.name || ""}!`, member.user.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 p-2 rounded-lg hover:bg-emerald-500/10 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                    {bandRole === "ADMIN" && (
                      <>
                        <button
                          onClick={() => {
                            setEditingMember(member);
                            setEditRole(member.bandRole);
                            setEditInstrument(member.instrument || "");
                          }}
                          className="text-zinc-500 hover:text-indigo-400 p-2 rounded-lg hover:bg-indigo-500/10 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleRemove(member.userId)} className="text-zinc-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
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
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Pending Account Invites</h2>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
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
                        {bandRoleLabel(invite.role)}
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
          <div className="lg:hidden space-y-3">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex flex-col p-4 rounded-2xl bg-black/20 hover:bg-black/40 transition-colors border border-zinc-800 gap-3">
                <p className="text-sm font-medium text-zinc-300">{invite.email}</p>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50 mt-1">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold tracking-wider ${
                    invite.role === "ADMIN"
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  }`}>
                    {bandRoleLabel(invite.role)}
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

      {bandRole === "ADMIN" && (
        <BandLinkInvites bandName={bandName} open={isModalOpen} onClose={() => setIsModalOpen(false)} />
      )}

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="glass-card rounded-3xl w-full max-w-lg p-6 border border-zinc-700/50 shadow-2xl relative">
            <button onClick={() => setEditingMember(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Edit Member</h2>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Member Name</label>
                <input type="text" disabled value={editingMember.user.name || editingMember.user.email || ""} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none opacity-50" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Instrument</label>
                <input
                  type="text"
                  value={editInstrument}
                  onChange={(e) => setEditInstrument(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none"
                  placeholder="e.g. lead guitar, drums, bass, vocals"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300 ml-1">Access Level</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="w-full glass-input rounded-xl px-4 py-2.5 text-sm outline-none [color-scheme:dark]">
                  <option value="MUSICIAN">Musician (Read-Only Access To Gigs/Gear)</option>
                  <option value="ADMIN">Admin (Can Schedule Gigs & Modify Gear)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingMember(null)} className="flex-1 py-3 rounded-xl font-medium text-sm text-zinc-300 glass hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isEditSubmitting} className="workspace-primary flex-1">
                  {isEditSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
