import { createHash, randomBytes } from "node:crypto";
import { getServerSession } from "next-auth";
import { encode } from "next-auth/jwt";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { calendarCallbackPath, calendarScope, calendarStateCookie, findGoogleAccount } from "@/lib/google-calendar";

export async function GET() {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const gigs = new URL("/dashboard/gigs", base);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.redirect(new URL("/login", base));
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET } = process.env;
  const account = await findGoogleAccount(session.user.id);
  if (!account || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !NEXTAUTH_SECRET) {
    gigs.searchParams.set("calendar", account ? "unavailable" : "link-required");
    return NextResponse.redirect(gigs);
  }
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const cookie = await encode({
    secret: NEXTAUTH_SECRET, maxAge: 600,
    token: { state, verifier, userId: session.user.id, accountId: account.id },
  });
  const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  google.search = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: new URL(calendarCallbackPath, base).href,
    response_type: "code",
    scope: `openid ${calendarScope}`,
    include_granted_scopes: "true",
    access_type: "offline",
    prompt: "consent",
    login_hint: account.providerAccountId,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
    state,
  }).toString();
  const response = NextResponse.redirect(google);
  response.cookies.set(calendarStateCookie, cookie, {
    path: calendarCallbackPath, maxAge: 600, httpOnly: true, sameSite: "lax", secure: gigs.protocol === "https:",
  });
  return response;
}
