import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

import { getBandContext } from "@/lib/band-context";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id);
  if (!bandMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const members = await prisma.bandMember.findMany({
    where: { bandId: bandMember.bandId },
    include: { user: { select: { id: true, name: true, email: true, role: true } } }
  });

  let pendingInvites: any[] = [];
  if (bandMember.bandRole === "ADMIN") {
    pendingInvites = await prisma.bandInvite.findMany({
      where: { bandId: bandMember.bandId }
    });
  }

  return NextResponse.json({ 
    members, 
    pendingInvites,
    bandName: bandMember.band.name,
    bandDescription: bandMember.band.description || ""
  });
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUserContext = await getBandContext(session.user.id);
  if (!currentUserContext) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { memberId, role, instrument } = await req.json();

    const targetMember = await prisma.bandMember.findUnique({
      where: { id: memberId }
    });

    if (!targetMember || targetMember.bandId !== currentUserContext.bandId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const updateData: any = {};

    // Only admins can change roles, and they cannot change their own role here
    if (role && role !== targetMember.bandRole) {
      if (currentUserContext.bandRole !== "ADMIN") {
        return NextResponse.json({ error: "Only admins can change roles" }, { status: 403 });
      }
      if (targetMember.userId === session.user.id) {
        return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
      }
      updateData.bandRole = role;
    }

    // Admins can change anyone's instrument, or users can change their own
    if (instrument !== undefined) {
      if (currentUserContext.bandRole === "ADMIN" || targetMember.userId === session.user.id) {
        updateData.instrument = instrument;
      } else {
        return NextResponse.json({ error: "Cannot change another member's instrument" }, { status: 403 });
      }
    }

    if (Object.keys(updateData).length > 0) {
      const updated = await prisma.bandMember.update({
        where: { id: memberId },
        data: updateData
      });
      return NextResponse.json({ success: true, member: updated });
    }

    return NextResponse.json({ success: true, member: targetMember });
  } catch (error) {
    console.error("Update member error", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminContext = await getBandContext(session.user.id, true);
  if (!adminContext) return NextResponse.json({ error: "Forbidden - Admins only" }, { status: 403 });

  try {
    const { email, role } = await req.json();

    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const targetUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User must be registered on GigSpot first." }, { status: 400 });
    }
    const existingInvite = await prisma.bandInvite.findUnique({
      where: { email_bandId: { email, bandId: adminContext.bandId } }
    });

    if (existingInvite) {
      return NextResponse.json({ error: "An invite for this email is already pending." }, { status: 400 });
    }

    // Check if the user is already in the band (if they exist)
    if (targetUser) {
      const existingMember = await prisma.bandMember.findUnique({
        where: {
          userId_bandId: {
            userId: targetUser.id,
            bandId: adminContext.bandId
          }
        }
      });
      if (existingMember) {
        return NextResponse.json({ error: "User is already in the band." }, { status: 400 });
      }
    }

    const newInvite = await prisma.bandInvite.create({
      data: {
        email,
        bandId: adminContext.bandId,
        role: role === "ADMIN" ? "ADMIN" : "MUSICIAN"
      }
    });

    return NextResponse.json({ success: true, pendingInvite: newInvite }, { status: 201 });
  } catch (error) {
    console.error("Invite error", error);
    return NextResponse.json({ error: "Failed to invite member" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminContext = await getBandContext(session.user.id, true);
  if (!adminContext) return NextResponse.json({ error: "Forbidden - Admins only" }, { status: 403 });

  try {
    const { userId, inviteId } = await req.json();

    if (inviteId) {
      // Delete a pending invite
      await prisma.bandInvite.deleteMany({
        where: { id: inviteId, bandId: adminContext.bandId }
      });
      return NextResponse.json({ success: true });
    }

    if (userId) {
      if (userId === session.user.id) {
        return NextResponse.json({ error: "You cannot remove yourself" }, { status: 400 });
      }

      await prisma.bandMember.delete({
        where: {
          userId_bandId: {
            userId,
            bandId: adminContext.bandId
          }
        }
      });

      // Send kick notification
      await prisma.notification.create({
        data: {
          userId,
          title: "Removed from Band",
          message: `You have been removed from ${adminContext.band.name} by an admin.`
        }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Provide userId or inviteId" }, { status: 400 });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove error", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
