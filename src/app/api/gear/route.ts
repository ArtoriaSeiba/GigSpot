import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import { getBandContext } from "@/lib/band-context";
import { toTitleCase } from "@/lib/utils";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id);
  if (!bandMember) return NextResponse.json({ error: "No band found" }, { status: 404 });

  const gear = await prisma.gear.findMany({
    where: { bandId: bandMember.bandId },
    orderBy: { type: "asc" }
  });

  return NextResponse.json(gear);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  
  if (!bandMember) {
    return NextResponse.json({ error: "Forbidden: Only admins can add gear" }, { status: 403 });
  }
  
  const band = bandMember.band;
  
  try {
    const { name, type, condition, assignedTo } = await req.json();

    if (!name || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newGear = await prisma.gear.create({
      data: {
        name: toTitleCase(name),
        type: toTitleCase(type),
        condition,
        assignedTo,
        bandId: band.id
      }
    });

    return NextResponse.json(newGear, { status: 201 });
  } catch (error) {
    console.error("Gear creation error", error);
    return NextResponse.json({ error: "Failed to add gear" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id, name, type, condition, assignedTo } = await req.json();

    const existingGear = await prisma.gear.findUnique({ where: { id } });
    if (!existingGear || existingGear.bandId !== bandMember.bandId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updatedGear = await prisma.gear.update({
      where: { id },
      data: {
        name: toTitleCase(name),
        type: toTitleCase(type),
        condition,
        assignedTo,
      }
    });

    return NextResponse.json(updatedGear);
  } catch (error) {
    console.error("Gear update error", error);
    return NextResponse.json({ error: "Failed to update gear" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await req.json();

    const existingGear = await prisma.gear.findUnique({ where: { id } });
    if (!existingGear || existingGear.bandId !== bandMember.bandId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.gear.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Gear delete error", error);
    return NextResponse.json({ error: "Failed to delete gear" }, { status: 500 });
  }
}
