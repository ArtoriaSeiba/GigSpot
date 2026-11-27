"use client";

import { useState, useEffect } from "react";
import { bandRoleLabel } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, X, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

type Invite = {
  id: string;
  band: { name: string };
  role: string;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const notificationLabels: Record<string, string> = {
  "Removed from Band": "Removed From Band",
};

function displayNotificationTitle(title: string) {
  const separator = title.indexOf(":");
  const label = separator === -1 ? title : title.slice(0, separator);
  if (!Object.hasOwn(notificationLabels, label)) return title;
  return separator === -1 ? notificationLabels[label] : notificationLabels[label] + title.slice(separator);
}

function getNotificationHref(notif: NotificationItem): string {
  const text = `${notif.title} ${notif.message}`.toLowerCase();
  if (text.includes("task")) return "/dashboard/tasks";
  if (text.includes("gig") || text.includes("setlist") || text.includes("schedule")) return "/dashboard/gigs";
  if (text.includes("gear") || text.includes("equipment")) return "/dashboard/gear";
  if (text.includes("finance") || text.includes("paid") || text.includes("payout")) return "/dashboard/finances";
  if (text.includes("band") || text.includes("role") || text.includes("member")) return "/dashboard/band";
  return "/dashboard";
}

export function GlobalAlerts() {
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const fetchAlerts = async () => {
    try {
      const [invRes, notifRes] = await Promise.all([
        fetch("/api/invites"),
        fetch("/api/notifications")
      ]);
      if (invRes.ok) {
        const data = await invRes.json();
        setInvites(Array.isArray(data) ? data : []);
      }
      if (notifRes.ok) {
        const data = await notifRes.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const markNotificationRead = async (notifId: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifId })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications([]);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    const href = getNotificationHref(notif);
    await markNotificationRead(notif.id);
    router.push(href);
  };

  const handleInviteResponse = async (inviteId: string, action: "accept" | "decline") => {
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteId, action })
      });
      if (res.ok) {
        setInvites(invites.filter((inv) => inv.id !== inviteId));
        if (action === "accept") {
          window.location.reload();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (invites.length === 0 && notifications.length === 0) return null;

  return (
    <div className="space-y-3 mb-6 w-full max-w-6xl mx-auto">
      <AnimatePresence>
        {invites.map((invite) => (
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
                You have been invited to join <span className="font-bold text-white">{invite.band.name}</span> as a {bandRoleLabel(invite.role).toLowerCase()}.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleInviteResponse(invite.id, "decline")}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
              >
                Decline
              </button>
              <button
                onClick={() => handleInviteResponse(invite.id, "accept")}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-indigo-500 hover:bg-indigo-400 text-white transition-colors"
              >
                Accept Invite
              </button>
            </div>
          </motion.div>
        ))}

        {notifications.length > 1 && (
          <div className="flex justify-end">
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg glass hover:bg-white/10 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5 text-cyan-400" />
              Mark All Read ({notifications.length})
            </button>
          </div>
        )}

        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={() => handleNotificationClick(notif)}
            className="bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 rounded-2xl p-4 flex items-start justify-between gap-4 w-full shadow-lg backdrop-blur-md cursor-pointer transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                  {displayNotificationTitle(notif.title)}
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </h3>
                <p className="text-zinc-400 text-xs mt-0.5">{notif.message}</p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                markNotificationRead(notif.id);
              }}
              title="Dismiss"
              className="text-zinc-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
