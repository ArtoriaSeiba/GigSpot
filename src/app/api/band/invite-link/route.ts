import { randomBytes } from "node:crypto";
import { PrismaClient, type BandLinkInvite } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { getBandContext } from "@/lib/band-context";
import { getInviteStatus, type BandLinkInviteHistoryPage, type BandLinkInviteSummary } from "@/lib/band-link-invites";

const prisma = new PrismaClient();
const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const HISTORY_PAGE_SIZE = 10;
const headers = { "Cache-Control": "no-store" };

async function adminBand() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Sign in to manage invites." }, { status: 401 }) };
  const membership = await getBandContext(session.user.id);
  if (membership?.bandRole !== "ADMIN") {
    return { error: NextResponse.json({ error: "Only admins of the active band can manage invites." }, { status: 403 }) };
  }
  return { bandId: membership.bandId };
}

function summarize(invite: BandLinkInvite, acceptedBy: string | null = null, now = new Date()): BandLinkInviteSummary {
  const status = getInviteStatus(invite, now);
  return {
    id: invite.id,
    status,
    path: status === "pending" ? `/invite/${invite.token}` : null,
    createdAt: invite.createdAt.toISOString(),
    expiresAt: invite.expiresAt.toISOString(),
    acceptedBy,
  };
}

export async function GET(request: Request) {
  const context = await adminBand();
  if (context.error) return context.error;

  const historyPage = new URL(request.url).searchParams.get("historyPage");
  const now = new Date();
  const orderBy = [{ createdAt: "desc" }, { id: "desc" }] as const;
  if (historyPage === null) {
    const invites = await prisma.bandLinkInvite.findMany({
      where: { bandId: context.bandId, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
      orderBy: [...orderBy],
    });
    return NextResponse.json(invites.map((invite) => summarize(invite, null, now)), { headers });
  }

  const page = /^\d+$/.test(historyPage) ? Number(historyPage) : NaN;
  const skip = (page - 1) * HISTORY_PAGE_SIZE;
  if (page < 1 || !Number.isSafeInteger(skip)) {
    return NextResponse.json({ error: "Invalid invite history page." }, { status: 400, headers });
  }
  const history = await prisma.bandLinkInvite.findMany({
    where: {
      bandId: context.bandId,
      OR: [{ acceptedAt: { not: null } }, { revokedAt: { not: null } }, { expiresAt: { lte: now } }],
    },
    orderBy: [...orderBy],
    include: { acceptedBy: { select: { name: true } } },
    skip,
    take: HISTORY_PAGE_SIZE + 1,
  });
  const response: BandLinkInviteHistoryPage = {
    items: history.slice(0, HISTORY_PAGE_SIZE).map((invite) => summarize(invite, invite.acceptedBy?.name, now)),
    hasNextPage: history.length > HISTORY_PAGE_SIZE,
  };
  return NextResponse.json(response, { headers });
}

export async function POST() {
  const context = await adminBand();
  if (context.error) return context.error;

  const invite = await prisma.bandLinkInvite.create({
    data: {
      bandId: context.bandId,
      token: randomBytes(32).toString("hex"),
      expiresAt: new Date(Date.now() + INVITE_LIFETIME_MS),
    },
  });
  return NextResponse.json(summarize(invite), { status: 201, headers });
}

export async function DELETE(request: Request) {
  const context = await adminBand();
  if (context.error) return context.error;

  const body = await request.json().catch(() => null);
  if (typeof body?.id !== "string" || !body.id) {
    return NextResponse.json({ error: "An invite is required." }, { status: 400 });
  }

  const now = new Date();
  const result = await prisma.bandLinkInvite.updateMany({
    where: { id: body.id, bandId: context.bandId, revokedAt: null, acceptedAt: null, expiresAt: { gt: now } },
    data: { revokedAt: now },
  });
  if (!result.count) return NextResponse.json({ error: "This invite is no longer pending in your band." }, { status: 409 });
  return NextResponse.json({ success: true }, { headers });
}
