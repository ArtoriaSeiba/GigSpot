import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import { getBandContext } from "@/lib/band-context";
import { notifyBandMembers } from "@/lib/notifications";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id);
  if (!bandMember) return NextResponse.json([]);

  const gigs = await prisma.gig.findMany({
    where: { bandId: bandMember.bandId },
    orderBy: { date: "asc" },
    include: {
      setlists: {
        include: {
          songs: {
            orderBy: { order: "asc" },
            include: {
              song: { select: { title: true, key: true, tempo: true } }
            }
          }
        }
      }
    }
  });

  const transactions = await prisma.financeTransaction.findMany({
    where: {
      bandId: bandMember.bandId,
      description: { startsWith: "[GIG_PAYMENT:" }
    }
  });

  const gigsWithPayment = gigs.map(gig => ({
    ...gig,
    isPaid: transactions.some(t => t.description.includes(`[GIG_PAYMENT:${gig.id}]`))
  }));

  return NextResponse.json(gigsWithPayment);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  
  if (!bandMember) {
    return NextResponse.json({ error: "Forbidden: Only admins can schedule gigs" }, { status: 403 });
  }
  
  const band = bandMember.band;
  
  try {
    const body = await req.json();
    const { title, date, loadInTime, venue, notes, income } = body;

    if (!title || !date || !venue) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const newGig = await prisma.gig.create({
      data: {
        title: title,
        date: new Date(date),
        loadInTime: loadInTime ? new Date(loadInTime) : null,
        venue: venue,
        notes,
        income: income ? parseFloat(income) : null,
        bandId: band.id
      }
    });

    await notifyBandMembers({
      bandId: band.id,
      excludeUserId: session.user.id,
      title: `New Gig: ${newGig.title}`,
      message: `${newGig.venue} on ${new Date(newGig.date).toLocaleDateString()}.`
    });

    return NextResponse.json(newGig, { status: 201 });
  } catch (error: any) {
    console.error("Gig creation error", error);
    return NextResponse.json({ error: "Failed to create gig: " + (error.message || error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) {
    return NextResponse.json({ error: "Forbidden: Only admins can delete gigs" }, { status: 403 });
  }

  try {
    const { gigId } = await req.json();
    if (!gigId) return NextResponse.json({ error: "Gig ID is required" }, { status: 400 });

    // Fetch all Google Calendar sync records for this gig
    const gigSyncs = await prisma.gigSync.findMany({
      where: { gigId },
      include: {
        user: {
          include: {
            accounts: {
              where: { provider: "google" }
            }
          }
        }
      }
    });

    // Attempt to delete the event from Google Calendar for each synced user
    for (const sync of gigSyncs) {
      const googleAccount = sync.user.accounts[0];
      if (googleAccount && googleAccount.access_token) {
        try {
          await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${sync.googleEventId}`, {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${googleAccount.access_token}`
            }
          });
        } catch (e) {
          console.error(`Failed to delete event from Google Calendar for user ${sync.userId}`, e);
        }
      }
    }

    await prisma.gig.delete({
      where: { id: gigId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete gig:", error);
    return NextResponse.json({ error: "Failed to delete gig: " + (error.message || error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) {
    return NextResponse.json({ error: "Forbidden: Only admins can edit gigs" }, { status: 403 });
  }

  try {
    const { gigId, title, date, loadInTime, venue, notes, income } = await req.json();

    if (!gigId || !title || !date || !venue) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingGig = await prisma.gig.findUnique({ where: { id: gigId } });
    if (!existingGig || existingGig.bandId !== bandMember.bandId) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    const updatedGig = await prisma.gig.update({
      where: { id: gigId },
      data: {
        title: title,
        date: new Date(date),
        loadInTime: loadInTime ? new Date(loadInTime) : null,
        venue: venue,
        notes,
        income: income ? parseFloat(income) : null,
      }
    });

    return NextResponse.json(updatedGig);
  } catch (error: any) {
    console.error("Failed to edit gig:", error);
    return NextResponse.json({ error: "Failed to edit gig: " + (error.message || error) }, { status: 500 });
  }
}
