import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { notifId } = await req.json();
    if (!notifId) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 });
    }

    // Only allow user to delete their own notifications
    await prisma.notification.deleteMany({
      where: {
        id: notifId,
        userId: session.user.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to dismiss notification" }, { status: 500 });
  }
}
