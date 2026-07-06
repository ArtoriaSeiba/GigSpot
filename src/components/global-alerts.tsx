"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Invite = {
  id: string;
  band: { name: string };
  role: string;
};

export function GlobalAlerts() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dismissedNotifs, setDismissedNotifs] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('dismissedNotifs');
    if (saved) {
      setDismissedNotifs(JSON.parse(saved));
    }
    fetchAlerts();
  }, []);

  const dismissNotification = (notifId: string) => {
    const newDismissed = [...dismissedNotifs, notifId];
    setDismissedNotifs(newDismissed);
    localStorage.setItem('dismissedNotifs', JSON.stringify(newDismissed));
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/invites");
      if (res.ok) {
        const data = await res.json();
        setInvites(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  };


  const handleInviteResponse = async (inviteId: string, action: 'accept' | 'decline') => {
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, action })
      });
      if (res.ok) {
        setInvites(invites.filter(inv => inv.id !== inviteId));
        if (action === 'accept') {
          window.location.reload();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (invites.length === 0) return null;

  return (
    <div className="space-y-3 mb-6 w-full max-w-6xl mx-auto">
      <AnimatePresence>
        {invites.map(invite => (
          <motion.div 
            key={invite.id} 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-indigo-600/20 border border-indigo-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full shadow-xl shadow-indigo-500/5 backdrop-blur-md"
          >
            <div>
              <h3 className="text-white font-bold text-sm">Band Invitation</h3>
              <p className="text-indigo-200 text-sm mt-1">
                You have been invited to join <span className="font-bold text-white">{invite.band.name}</span> as a {invite.role}.
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleInviteResponse(invite.id, 'decline')} 
                className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
              >
                Decline
              </button>
              <button 
                onClick={() => handleInviteResponse(invite.id, 'accept')} 
                className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-500 hover:bg-indigo-400 text-white transition-colors"
              >
                Accept Invite
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
