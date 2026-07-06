import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getBandContext } from "@/lib/band-context";

const prisma = new PrismaClient();

export async function GET(req: Request, { params }: { params: Promise<{ gigId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id);
  if (!bandMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const gigId = (await params).gigId;

  const gig = await prisma.gig.findUnique({
    where: { id: gigId },
    include: {
      setlists: {
        include: {
          songs: {
            include: { song: true },
            orderBy: { order: 'asc' }
          }
        }
      }
    }
  });

  if (!gig || gig.bandId !== bandMember.bandId) {
    return NextResponse.json({ error: "Gig not found" }, { status: 404 });
  }

  // Fetch all available songs for the band to allow adding to the setlist
  const availableSongs = await prisma.song.findMany({
    where: { bandId: bandMember.bandId },
    orderBy: { title: 'asc' }
  });

  return NextResponse.json({ gig, availableSongs });
}

export async function POST(req: Request, { params }: { params: Promise<{ gigId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const gigId = (await params).gigId;

  try {
    const { songId } = await req.json();

    // Find or create the setlist for this gig
    let setlist = await prisma.setlist.findFirst({
      where: { gigId: gigId }
    });

    if (!setlist) {
      setlist = await prisma.setlist.create({
        data: {
          name: "Main Setlist",
          gigId: gigId
        }
      });
    }

    // Get current max order
    const currentSongs = await prisma.setlistSong.findMany({
      where: { setlistId: setlist.id },
      orderBy: { order: 'desc' },
      take: 1
    });
    
    const nextOrder = currentSongs.length > 0 ? currentSongs[0].order + 1 : 1;

    const setlistSong = await prisma.setlistSong.create({
      data: {
        setlistId: setlist.id,
        songId,
        order: nextOrder
      },
      include: { song: true }
    });

    return NextResponse.json(setlistSong, { status: 201 });
  } catch (error: any) {
    console.error("Failed to add song to setlist:", error);
    if (error.code === 'P2002') {
       return NextResponse.json({ error: "Song is already in the setlist" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add song" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ gigId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { setlistSongId } = await req.json();
    
    await prisma.setlistSong.delete({
      where: { id: setlistSongId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove song:", error);
    return NextResponse.json({ error: "Failed to remove song" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ gigId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { reorderedSongs } = await req.json(); // Array of { id, order }

    // Bulk update orders
    // Prisma doesn't have a simple bulk update for different values, so we use a transaction
    await prisma.$transaction(
      reorderedSongs.map((song: { id: string, order: number }) => 
        prisma.setlistSong.update({
          where: { id: song.id },
          data: { order: song.order }
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder songs:", error);
    return NextResponse.json({ error: "Failed to reorder songs" }, { status: 500 });
  }
}
