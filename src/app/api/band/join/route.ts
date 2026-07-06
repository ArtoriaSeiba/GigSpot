import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { token } = await req.json();

    if (!token) return NextResponse.json({ error: "Token is required" }, { status: 400 });

    const band = await prisma.band.findUnique({
      where: { inviteToken: token }
    });

    if (!band) {
      return NextResponse.json({ error: "Invalid or expired invite link" }, { status: 404 });
    }

    // Check if already a member
    const existingMember = await prisma.bandMember.findUnique({
      where: {
        userId_bandId: {
          userId: session.user.id,
          bandId: band.id
        }
      }
    });

    if (existingMember) {
      return NextResponse.json({ success: true, message: "Already a member", bandId: band.id });
    }

    // Join band as MUSICIAN
    await prisma.bandMember.create({
      data: {
        userId: session.user.id,
        bandId: band.id,
        bandRole: "MUSICIAN"
      }
    });

    return NextResponse.json({ success: true, bandId: band.id });
  } catch (error) {
    console.error("Join band error", error);
    return NextResponse.json({ error: "Failed to join band" }, { status: 500 });
  }
}
