import { cookies } from "next/headers";
import { AuthEntry } from "@/components/auth-entry";
import { inviteAuthCallback } from "@/lib/band-link-invites";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;
  let invite = typeof callbackUrl === "string" ? inviteAuthCallback(callbackUrl) : null;
  if (error && !invite) {
    const jar = await cookies();
    const base = new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000");
    const name = base.protocol === "https:" ? "__Secure-next-auth.callback-url" : "next-auth.callback-url";
    const previous = jar.get(name)?.value;
    if (previous) {
      try {
        const url = new URL(previous, base);
        if (url.origin === base.origin) invite = inviteAuthCallback(url.pathname);
      } catch {
        // A stale callback cookie can be ignored.
      }
    }
  }
  return <AuthEntry invite={invite} />;
}
