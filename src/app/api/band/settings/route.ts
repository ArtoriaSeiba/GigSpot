import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getBandContext } from "@/lib/band-context";

const prisma = new PrismaClient();

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const bandMember = await getBandContext(userId, true); // Require admin to edit settings

  if (!bandMember) {
    return NextResponse.json({ error: "Forbidden or no active band" }, { status: 403 });
  }

  try {
    const { name, description } = await req.json();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const updatedBand = await prisma.band.update({
      where: { id: bandMember.bandId },
      data: { name, description }
    });

    return NextResponse.json(updatedBand);
  } catch (error) {
    console.error("Failed to update band settings:", error);
    return NextResponse.json({ error: "Failed to update band settings" }, { status: 500 });
  }
}
