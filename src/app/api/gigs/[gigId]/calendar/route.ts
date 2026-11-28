import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getBandContext } from "@/lib/band-context";
import { calendarRequest } from "@/lib/google-calendar";

const prisma = new PrismaClient();

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ gigId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gigId } = await params;
    
    // Validate gig and band context
    const bandMember = await getBandContext(session.user.id);
    if (!bandMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const gig = await prisma.gig.findUnique({
      where: { id: gigId }
    });

    if (!gig || gig.bandId !== bandMember.bandId) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    const gigDate = new Date(gig.date);
    const endDate = new Date(gigDate.getTime() + 4 * 60 * 60 * 1000); // Assume 4 hours duration

    // Prepare Google Calendar Event payload
    const event = {
      summary: gig.title,
      location: gig.venue,
      description: `Load in: ${gig.loadInTime ? new Date(gig.loadInTime).toLocaleTimeString() : 'N/A'}\nNotes: ${gig.notes || 'None'}`,
      start: {
        dateTime: gigDate.toISOString(),
      },
      end: {
        dateTime: endDate.toISOString(),
      },
    };

    // Check if it's already synced
    const existingSync = await prisma.gigSync.findUnique({
      where: {
        userId_gigId: {
          userId: session.user.id,
          gigId: gig.id
        }
      }
    });

    const eventsUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    const result = await calendarRequest(session.user.id, existingSync ? `${eventsUrl}/${encodeURIComponent(existingSync.googleEventId)}` : eventsUrl, {
      method: existingSync ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (!result.response) {
      return NextResponse.json({ error: "Connect Google Calendar to continue.", code: result.code }, { status: 409 });
    }
    const googleRes = result.response;
    if (!googleRes.ok) return NextResponse.json({ error: "Could not save this event to Google Calendar." }, { status: 502 });

    const data = await googleRes.json();
    
    if (data.id) {
      await prisma.gigSync.upsert({
        where: {
          userId_gigId: {
            userId: session.user.id,
            gigId: gig.id
          }
        },
        update: {
          googleEventId: data.id
        },
        create: {
          userId: session.user.id,
          gigId: gig.id,
          googleEventId: data.id
        }
      });
    }

    return NextResponse.json({ success: true, eventUrl: data.htmlLink });
    
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json({ error: "Could not sync this gig. Try again." }, { status: 500 });
  }
}
