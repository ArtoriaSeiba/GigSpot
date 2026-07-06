import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const memberships = await prisma.bandMember.findMany({
      where: { userId: session.user.id },
      include: { band: true }
    });

    return NextResponse.json(memberships);
  } catch (error) {
    console.error("Fetch my bands error", error);
    return NextResponse.json({ error: "Failed to fetch bands" }, { status: 500 });
  }
}
