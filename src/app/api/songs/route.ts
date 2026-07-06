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

  const songs = await prisma.song.findMany({
    where: { bandId: bandMember.bandId },
    orderBy: { title: "asc" }
  });

  return NextResponse.json(songs);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  
  if (!bandMember) {
    return NextResponse.json({ error: "Forbidden: Only admins can add songs" }, { status: 403 });
  }
  
  const band = bandMember.band;
  
  try {
    const { title, artist, key, tempo } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    const newSong = await prisma.song.create({
      data: {
        title: toTitleCase(title),
        artist: toTitleCase(artist),
        key: toTitleCase(key),
        tempo: tempo ? parseInt(tempo, 10) : null,
        bandId: band.id
      }
    });

    return NextResponse.json(newSong, { status: 201 });
  } catch (error) {
    console.error("Song creation error", error);
    return NextResponse.json({ error: "Failed to create song" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id, title, artist, key, tempo } = await req.json();

    const existingSong = await prisma.song.findUnique({ where: { id } });
    if (!existingSong || existingSong.bandId !== bandMember.bandId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updatedSong = await prisma.song.update({
      where: { id },
      data: {
        title: toTitleCase(title),
        artist: toTitleCase(artist),
        key: toTitleCase(key),
        tempo: tempo ? parseInt(tempo, 10) : null,
      }
    });

    return NextResponse.json(updatedSong);
  } catch (error) {
    console.error("Song update error", error);
    return NextResponse.json({ error: "Failed to update song" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await req.json();

    const existingSong = await prisma.song.findUnique({ where: { id } });
    if (!existingSong || existingSong.bandId !== bandMember.bandId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.song.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Song delete error", error);
    return NextResponse.json({ error: "Failed to delete song" }, { status: 500 });
  }
}
