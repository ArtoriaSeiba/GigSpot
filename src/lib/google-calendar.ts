import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const calendarScope = "https://www.googleapis.com/auth/calendar.events";
export const calendarCallbackPath = "/api/calendar/connect/callback";
export const calendarStateCookie = "gigspot-calendar-oauth";

export function hasCalendarScope(scope?: string | null) {
  return scope?.split(/\s+/).includes(calendarScope) || scope?.split(/\s+/).includes("https://www.googleapis.com/auth/calendar");
}

export function findGoogleAccount(userId: string) {
  return prisma.account.findFirst({ where: { userId, provider: "google" } });
}

type GoogleTokens = { access_token: string; expires_in?: number; refresh_token?: string; scope?: string };

export async function requestGoogleTokens(params: Record<string, string>) {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) throw new Error("Google OAuth is unavailable.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ ...params, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET }),
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 400 || response.status === 401) return null;
  if (!response.ok) throw new Error("Could not reach Google authorization.");
  const tokens: GoogleTokens = await response.json();
  return tokens.access_token ? tokens : null;
}

export async function saveCalendarTokens(accountId: string, tokens: GoogleTokens) {
  await prisma.account.update({
    where: { id: accountId },
    data: {
      access_token: tokens.access_token,
      expires_at: Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600),
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
    },
  });
}

export async function calendarAccess(userId: string, refresh = false) {
  const account = await findGoogleAccount(userId);
  if (!account) return { token: null, code: "ACCOUNT_NOT_LINKED" } as const;
  if (!hasCalendarScope(account.scope)) return { token: null, code: "CALENDAR_CONNECTION_REQUIRED" } as const;
  if (!refresh && account.access_token && account.expires_at && account.expires_at > Date.now() / 1000 + 60) {
    return { token: account.access_token } as const;
  }
  if (!account.refresh_token) return { token: null, code: "CALENDAR_CONNECTION_REQUIRED" } as const;
  const tokens = await requestGoogleTokens({ grant_type: "refresh_token", refresh_token: account.refresh_token });
  if (!tokens || (tokens.scope && !hasCalendarScope(tokens.scope))) {
    return { token: null, code: "CALENDAR_CONNECTION_REQUIRED" } as const;
  }
  await saveCalendarTokens(account.id, tokens);
  return { token: tokens.access_token } as const;
}

export async function calendarRequest(userId: string, url: string, options: RequestInit) {
  async function send(token: string) {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...options, headers, signal: AbortSignal.timeout(15000) });
  }

  let access = await calendarAccess(userId);
  if (!access.token) return { code: access.code } as const;
  let response = await send(access.token);
  if (response.status === 401) {
    access = await calendarAccess(userId, true);
    if (!access.token) return { code: access.code } as const;
    response = await send(access.token);
    if (response.status === 401) return { code: "CALENDAR_CONNECTION_REQUIRED" } as const;
  }
  if (response.status === 403) {
    const body = await response.clone().json().catch(() => null);
    if (body?.error?.errors?.some((error: { reason: string }) => error.reason === "insufficientPermissions")
      || body?.error?.details?.some((detail: { reason: string }) => detail.reason === "ACCESS_TOKEN_SCOPE_INSUFFICIENT")) {
      return { code: "CALENDAR_CONNECTION_REQUIRED" } as const;
    }
  }
  return { response } as const;
}
