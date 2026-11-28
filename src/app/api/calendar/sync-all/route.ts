import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getBandContext } from "@/lib/band-context";
import { calendarRequest } from "@/lib/google-calendar";

const prisma = new PrismaClient();

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bandMember = await getBandContext(session.user.id);
    if (!bandMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all upcoming gigs for the band
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingGigs = await prisma.gig.findMany({
      where: {
        bandId: bandMember.bandId,
        date: { gte: today }
      },
      include: {
        gigSyncs: {
          where: { userId: session.user.id }
        }
      }
    });

    // Filter out gigs that have already been synced by this user
    const unsyncedGigs = upcomingGigs.filter(gig => gig.gigSyncs.length === 0);

    if (unsyncedGigs.length === 0) {
      return NextResponse.json({ success: true, message: "All upcoming gigs are already synced." });
    }

    let syncedCount = 0;
    const errors = [];

    for (const gig of unsyncedGigs) {
      const gigDate = new Date(gig.date);
      const endDate = new Date(gigDate.getTime() + 4 * 60 * 60 * 1000); // 4 hours

      const event = {
        summary: gig.title,
        location: gig.venue,
        description: `Load in: ${gig.loadInTime ? new Date(gig.loadInTime).toLocaleTimeString() : 'N/A'}\nNotes: ${gig.notes || 'None'}`,
        start: { dateTime: gigDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
      };

      const result = await calendarRequest(session.user.id, "https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event)
      });

      if (!result.response) {
        return NextResponse.json({ error: "Connect Google Calendar to continue.", code: result.code }, { status: 409 });
      }
      const googleRes = result.response;
      if (!googleRes.ok) {
        errors.push(`Failed to sync ${gig.title}`);
        continue;
      }

      const data = await googleRes.json();

      if (data.id) {
        await prisma.gigSync.create({
          data: {
            userId: session.user.id,
            gigId: gig.id,
            googleEventId: data.id
          }
        });
        syncedCount++;
      }
    }

    if (errors.length > 0 && syncedCount === 0) {
      return NextResponse.json({ error: "Failed to sync gigs", details: errors }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully synced ${syncedCount} gig(s) to your calendar.` 
    });

  } catch (error) {
    console.error("Sync All error:", error);
    return NextResponse.json({ error: "Could not sync gigs. Try again." }, { status: 500 });
  }
}
