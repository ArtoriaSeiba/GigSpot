import { getServerSession } from "next-auth";
import { decode } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { calendarCallbackPath, calendarStateCookie, findGoogleAccount, hasCalendarScope, requestGoogleTokens, saveCalendarTokens } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const gigs = new URL("/dashboard/gigs", base);

  function finish(status: string) {
    gigs.searchParams.set("calendar", status);
    const response = NextResponse.redirect(gigs);
    response.cookies.set(calendarStateCookie, "", {
      path: calendarCallbackPath, maxAge: 0, httpOnly: true, sameSite: "lax", secure: gigs.protocol === "https:",
    });
    return response;
  }

  try {
    const secret = process.env.NEXTAUTH_SECRET;
    const cookie = request.cookies.get(calendarStateCookie)?.value;
    if (!secret || !cookie) return finish("failed");
    const attempt = await decode({ secret, token: cookie });
    const session = await getServerSession(authOptions);
    const params = request.nextUrl.searchParams;
    if (!session?.user?.id || !attempt || attempt.userId !== session.user.id
      || typeof attempt.state !== "string" || attempt.state !== params.get("state")
      || typeof attempt.verifier !== "string") return finish("failed");
    if (params.get("error") === "access_denied") return finish("cancelled");
    const code = params.get("code");
    if (!code) return finish("failed");
    const account = await findGoogleAccount(session.user.id);
    if (!account || account.id !== attempt.accountId) return finish("failed");
    const tokens = await requestGoogleTokens({
      code, grant_type: "authorization_code", code_verifier: attempt.verifier,
      redirect_uri: new URL(calendarCallbackPath, base).href,
    });
    if (!tokens || !hasCalendarScope(tokens.scope)) return finish("cancelled");
    const profile = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!profile.ok) return finish("failed");
    const { sub } = await profile.json();
    if (sub !== account.providerAccountId) return finish("wrong-account");
    await saveCalendarTokens(account.id, tokens);
    return finish("connected");
  } catch {
    return finish("failed");
  }
}
