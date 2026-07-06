import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getBandContext } from "@/lib/band-context";

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  { params }: { params: { gigId: string } }
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

    let googleRes;
    
    if (existingSync) {
      // Update existing event
      googleRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingSync.googleEventId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event)
      });
    } else {
      // Create new event
      googleRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${account.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event)
      });
    }

    if (!googleRes.ok) {
      const errorData = await googleRes.json();
      if (googleRes.status === 401) {
        return NextResponse.json({ 
          error: "Google session expired. Please sign out and sign back in with Google.",
          code: "TOKEN_EXPIRED" 
        }, { status: 401 });
      }
      throw new Error(errorData.error?.message || "Failed to sync with Google Calendar");
    }

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
    
  } catch (error: any) {
    console.error("Calendar sync error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
