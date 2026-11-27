import { Prisma, PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getInviteStatus, isBandLinkToken, type BandLinkPreview, type InviteStatus } from "@/lib/band-link-invites";
import { notifyBandMembers } from "@/lib/notifications";

const prisma = new PrismaClient();
const headers = { "Cache-Control": "no-store" };

function preview(value: BandLinkPreview) {
  return NextResponse.json(value, { headers });
}

const unavailable: Record<Exclude<InviteStatus, "pending"> | "invalid", string> = {
  invalid: "This invite link is unavailable. Ask a band admin for a new link.",
  expired: "This invite has expired. Ask a band admin for a new link.",
  revoked: "This invite was revoked. Ask a band admin for a new link.",
  accepted: "This invite has already been used. Ask a band admin for a new link.",
};

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const signedIn = Boolean(userId);
  if (!isBandLinkToken(token)) return preview({ status: "invalid", signedIn });

  const invite = await prisma.bandLinkInvite.findUnique({
    where: { token },
    include: { band: { select: { name: true } } },
  });
  if (!invite) return preview({ status: "invalid", signedIn });

  const status = getInviteStatus(invite);
  if (userId && (status === "pending" || invite.acceptedById === userId)) {
    const member = await prisma.bandMember.findUnique({
      where: { userId_bandId: { userId, bandId: invite.bandId } },
      select: { id: true },
    });
    if (member) return preview({ status: "already-member", signedIn, bandName: invite.band.name });
  }

  return preview(status === "pending" ? { status, signedIn, bandName: invite.band.name } : { status, signedIn });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Sign in to join this band." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const token: unknown = body?.token;
  if (!isBandLinkToken(token)) return NextResponse.json({ error: unavailable.invalid }, { status: 404 });

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const invite = await tx.bandLinkInvite.findUnique({
        where: { token },
        include: { band: { select: { name: true } } },
      });
      if (!invite) return { status: "invalid" } as const;

      const status = getInviteStatus(invite);
      if (status === "pending" || invite.acceptedById === userId) {
        const exists = await tx.bandMember.findUnique({
          where: { userId_bandId: { userId, bandId: invite.bandId } },
          select: { id: true },
        });
        if (exists) return { status: "already-member", bandId: invite.bandId } as const;
      }
      if (status !== "pending") return { status } as const;

      const now = new Date();
      // Claim only an active link. The membership and claim commit together.
      const claimed = await tx.bandLinkInvite.updateMany({
        where: { id: invite.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { acceptedAt: now, acceptedById: userId },
      });
      if (!claimed.count) return { status: "unavailable" } as const;

      await tx.bandMember.create({ data: { userId, bandId: invite.bandId, bandRole: "MUSICIAN" } });
      return { status: "joined", bandId: invite.bandId, bandName: invite.band.name } as const;
    });

    if (outcome.status === "joined" || outcome.status === "already-member") {
      if (outcome.status === "joined") {
        await notifyBandMembers({
          bandId: outcome.bandId,
          excludeUserId: userId,
          title: "New Band Member",
          message: `${session.user.name || session.user.email || "A musician"} joined ${outcome.bandName}!`,
        });
      }
      const response = NextResponse.json({ bandId: outcome.bandId }, { headers });
      response.cookies.set("activeBandId", outcome.bandId, { path: "/", maxAge: 31536000, sameSite: "lax" });
      return response;
    }

    const message = outcome.status === "unavailable"
      ? "This invite changed. Refresh the page to see its status."
      : unavailable[outcome.status];
    return NextResponse.json({ error: message }, { status: outcome.status === "invalid" ? 404 : 409 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
      return NextResponse.json({ error: "Membership or invite status changed. Refresh the page and try again." }, { status: 409 });
    }
    console.error("Could not accept band link", error);
    return NextResponse.json({ error: "Could not join the band. Try again." }, { status: 500 });
  }
}
