export function toTitleCase(str: any): string {
  if (typeof str !== "string" || !str) return "";
  return str
    .split(" ")
    .map((word) => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : "")
    .join(" ");
}

export function bandRoleLabel(role: string): string {
  if (role === "ADMIN") return "Admin";
  if (role === "MUSICIAN") return "Musician";
  return role;
}

export function taskAssigneeIds(assignedTo: string | null | undefined): string[] {
  return assignedTo?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];
}

/** Build a WhatsApp click-to-chat URL with optional phone number and pre-filled message. */
export function buildWhatsAppUrl(message?: string, phone?: string | null): string {
  const digits = phone ? phone.replace(/\D/g, "") : "";
  const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

type CallSheetGig = {
  title: string;
  date: string;
  loadInTime?: string | null;
  venue: string;
  notes?: string | null;
  setlists?: {
    songs: {
      song: { title: string; key?: string | null; tempo?: number | null };
    }[];
  }[];
};

/** Format a gig's schedule, venue, and setlist into a WhatsApp-ready call sheet. */
export function formatGigCallSheet(gig: CallSheetGig): string {
  const dateStr = new Date(gig.date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const lines: string[] = [
    `*Gig Call Sheet — ${gig.title}*`,
    `--------------------------------`,
    `*Date:* ${dateStr}`,
  ];

  if (gig.loadInTime) {
    const timeStr = new Date(gig.loadInTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    lines.push(`*Load-in:* ${timeStr}`);
  }

  lines.push(`*Venue:* ${gig.venue}`);

  if (gig.notes?.trim()) {
    lines.push(`*Notes:* ${gig.notes.trim()}`);
  }

  const songs = gig.setlists?.[0]?.songs || [];
  if (songs.length > 0) {
    lines.push("", `*Setlist (${songs.length} ${songs.length === 1 ? "song" : "songs"})*`, `--------------------------------`);
    songs.forEach((item, idx) => {
      const meta = [item.song.key, item.song.tempo ? `${item.song.tempo} BPM` : null]
        .filter(Boolean)
        .join(" | ");
      lines.push(`${idx + 1}. *${item.song.title}*${meta ? ` — _${meta}_` : ""}`);
    });
  }

  return lines.join("\n");
}
