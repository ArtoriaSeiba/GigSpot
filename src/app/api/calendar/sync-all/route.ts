import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getBandContext } from "@/lib/band-context";

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

    // Get the Google Account linked to this user
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "google"
      }
    });

    if (!account || !account.access_token) {
      return NextResponse.json({ 
        error: "Google account not linked",
        code: "ACCOUNT_NOT_LINKED" 
      }, { status: 400 });
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

      const googleRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event)
      });

      if (!googleRes.ok) {
        if (googleRes.status === 401) {
          return NextResponse.json({ 
            error: "Google session expired. Please sign out and sign back in with Google.",
            code: "TOKEN_EXPIRED" 
          }, { status: 401 });
        }
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

  } catch (error: any) {
    console.error("Sync All error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
