import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getBandContext } from "@/lib/band-context";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminContext = await getBandContext(session.user.id, true);
  if (!adminContext) return NextResponse.json({ error: "Forbidden - Admins only" }, { status: 403 });

  try {
    let band = await prisma.band.findUnique({
      where: { id: adminContext.bandId }
    });

    if (!band) return NextResponse.json({ error: "Band not found" }, { status: 404 });

    // Generate token if not exists
    if (!band.inviteToken) {
      const token = uuidv4();
      band = await prisma.band.update({
        where: { id: band.id },
        data: { inviteToken: token }
      });
    }

    // In a real app, this should dynamically use the request's host
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (req.headers.get("origin") ?? "http://localhost:3000");
    const inviteUrl = `${appUrl}/invite/${band.inviteToken}`;

    return NextResponse.json({ success: true, inviteUrl });
  } catch (error) {
    console.error("Invite link error", error);
    return NextResponse.json({ error: "Failed to generate invite link" }, { status: 500 });
  }
}
