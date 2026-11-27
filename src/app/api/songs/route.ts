import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import { getBandContext } from "@/lib/band-context";
import { CHART_LIMIT, NOTES_LIMIT, parseSongKey } from "@/lib/song-rehearsal";

const textLimits = { artist: 191, key: 50, originalKey: 50, chartKey: 50, chordChart: CHART_LIMIT, rehearsalNotes: NOTES_LIMIT, tuning: 100, recordingAlbum: 191 } as const;

const numericFields = {
  tempo: [1, 500, "Enter a whole-number tempo from 1 to 500 BPM."],
  originalTempo: [1, 500, "Enter a whole-number tempo from 1 to 500 BPM."],
  capo: [0, 24, "Enter a capo fret from 0 to 24."],
  recordingYear: [1800, 9999, "Invalid recording release year."],
  recordingDuration: [1, 86400, "Invalid recording duration."],
} as const;

function songFields(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 191) return { error: "Enter a song title of up to 191 characters." } as const;

  const data: { title: string } & Partial<Record<keyof typeof textLimits, string | null>> &
    Partial<Record<keyof typeof numericFields, number | null>> = { title };
  for (const field of Object.keys(textLimits) as (keyof typeof textLimits)[]) {
    const raw = body[field];
    if (raw === undefined) continue;
    if (raw !== null && (typeof raw !== "string" || raw.length > textLimits[field])) {
      return { error: "One of the song fields is too long or invalid." } as const;
    }
    const value = raw?.trim() || null;
    data[field] = /Key$/.test(field) || field === "key" ? parseSongKey(value)?.name ?? value : value;
  }
  for (const field of Object.keys(numericFields) as (keyof typeof numericFields)[]) {
    const value = body[field];
    if (value === undefined) continue;
    if (value === null || value === "") {
      data[field] = null;
      continue;
    }
    const number = typeof value === "number" || typeof value === "string" ? Number(value) : NaN;
    const [min, max, error] = numericFields[field];
    if (!Number.isInteger(number) || number < min || number > max) {
      return { error } as const;
    }
    data[field] = number;
  }
  return { data } as const;
}

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

  const bandMember = await getBandContext(session.user.id);
  
  if (bandMember?.bandRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Only admins can add songs" }, { status: 403 });
  }
  
  const band = bandMember.band;
  
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid song." }, { status: 400 });
    const fields = songFields(body);
    if ("error" in fields) return NextResponse.json({ error: fields.error }, { status: 400 });
    const newSong = await prisma.song.create({
      data: {
        ...fields.data,
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

  const bandMember = await getBandContext(session.user.id);
  if (bandMember?.bandRole !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.id !== "string") return NextResponse.json({ error: "Invalid song." }, { status: 400 });
    const { id } = body;
    const fields = songFields(body);
    if ("error" in fields) return NextResponse.json({ error: fields.error }, { status: 400 });

    const existingSong = await prisma.song.findUnique({ where: { id } });
    if (!existingSong || existingSong.bandId !== bandMember.bandId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updatedSong = await prisma.song.update({
      where: { id },
      data: fields.data
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

  const bandMember = await getBandContext(session.user.id);
  if (bandMember?.bandRole !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
