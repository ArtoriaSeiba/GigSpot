import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getBandContext } from "@/lib/band-context";
import { notifyBandMembers } from "@/lib/notifications";

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ gigId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id);
  if (!bandMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const gigId = (await params).gigId;

  const paymentTransaction = await prisma.financeTransaction.findFirst({
    where: {
      bandId: bandMember.bandId,
      description: {
        startsWith: `[GIG_PAYMENT:${gigId}]`
      }
    }
  });

  return NextResponse.json({ isPaid: !!paymentTransaction });
}

export async function POST(req: Request, { params }: { params: Promise<{ gigId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const gigId = (await params).gigId;

  try {
    const gig = await prisma.gig.findUnique({
      where: { id: gigId }
    });

    if (!gig || gig.bandId !== bandMember.bandId) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    if (!gig.income || gig.income <= 0) {
      return NextResponse.json({ error: "Gig has no income set" }, { status: 400 });
    }

    // Check if already paid
    const existing = await prisma.financeTransaction.findFirst({
      where: {
        bandId: bandMember.bandId,
        description: { startsWith: `[GIG_PAYMENT:${gigId}]` }
      }
    });

    if (existing) {
      return NextResponse.json({ error: "Payment already recorded" }, { status: 400 });
    }

    // Create payment
    const transaction = await prisma.financeTransaction.create({
      data: {
        bandId: bandMember.bandId,
        type: "INCOME",
        amount: gig.income,
        description: `[GIG_PAYMENT:${gigId}] Payment received for gig: ${gig.title}`
      }
    });

    await notifyBandMembers({
      bandId: bandMember.bandId,
      excludeUserId: session.user.id,
      title: "Gig Payout Logged",
      message: `$${gig.income} income recorded for ${gig.title}.`
    });

    return NextResponse.json({ success: true, transaction });
  } catch (error) {
    console.error("Failed to record payment:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
