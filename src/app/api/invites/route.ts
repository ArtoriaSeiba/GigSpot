import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const invites = await prisma.bandInvite.findMany({
      where: { email: session.user.email },
      include: { band: { select: { name: true } } }
    });

    return NextResponse.json(invites);
  } catch (error) {
    console.error("Fetch invites error", error);
    return NextResponse.json({ error: "Failed to fetch invites" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { inviteId, action } = await req.json();

    if (!inviteId || !["accept", "decline"].includes(action)) {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 });
    }

    // Verify invite exists and belongs to the user
    const invite = await prisma.bandInvite.findUnique({
      where: { id: inviteId }
    });

    if (!invite || invite.email !== session.user.email) {
      return NextResponse.json({ error: "Invite not found or access denied" }, { status: 404 });
    }

    if (action === "accept") {
      // Check if user is already a member
      const existingMember = await prisma.bandMember.findUnique({
        where: { userId_bandId: { userId: session.user.id, bandId: invite.bandId } }
      });

      if (!existingMember) {
        // Add user to the band
        await prisma.bandMember.create({
          data: {
            userId: session.user.id,
            bandId: invite.bandId,
            bandRole: invite.role
          }
        });
      }
    }

    // Whether accepted or declined, we delete the invite
    await prisma.bandInvite.delete({
      where: { id: invite.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Process invite error", error);
    return NextResponse.json({ error: "Failed to process invite" }, { status: 500 });
  }
}
