export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export type BandLinkInviteSummary = {
  id: string;
  status: InviteStatus;
  path: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedBy: string | null;
};

export type BandLinkInviteHistoryPage = {
  items: BandLinkInviteSummary[];
  hasNextPage: boolean;
};

export type BandLinkPreview = {
  status: InviteStatus | "invalid" | "already-member";
  signedIn: boolean;
  bandName?: string;
};

export function getInviteStatus(invite: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date }, now = new Date()): InviteStatus {
  if (invite.acceptedAt) return "accepted";
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt <= now) return "expired";
  return "pending";
}

export function isBandLinkToken(token: unknown): token is string {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}

export function inviteAuthCallback(value: string | null) {
  const prefix = "/invite/";
  return value?.startsWith(prefix) && isBandLinkToken(value.slice(prefix.length)) ? value : null;
}

export function inviteAuthHref(path: "/login" | "/register", callback: string | null) {
  return callback ? `${path}?${new URLSearchParams({ callbackUrl: callback })}` : path;
}

export function canShareBandInvite(url: string) {
  const { protocol, hostname } = new URL(url);
  const host = hostname.replace(/\.$/, "");
  return protocol === "https:"
    && host.includes(".")
    && !/\.(localhost|local|test|example|invalid|internal)$/.test(host)
    && !/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(host);
}

export function formatBandInviteMessage(bandName: string, url: string) {
  const name = bandName.replace(/\s+/g, " ").trim();
  return [
    "*GigSpot Band Invitation*",
    `You're invited to join ${name} on GigSpot as a Musician.`,
    "This link is for one person and can only be used once.",
    url,
  ].join("\n\n");
}
