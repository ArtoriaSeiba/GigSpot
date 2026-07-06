import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, description } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Band name is required" }, { status: 400 });
    }

    const band = await prisma.band.create({
      data: {
        name,
        description: description || null,
        members: {
          create: {
            userId: session.user.id,
            bandRole: "ADMIN"
          }
        }
      }
    });

    const cookieStore = await cookies();
    cookieStore.set("activeBandId", band.id, { path: "/" });

    return NextResponse.json(band, { status: 201 });
  } catch (error: any) {
    console.error("Band creation error:", error);
    return NextResponse.json({ error: "Failed to create band: " + (error.message || error) }, { status: 500 });
  }
}
