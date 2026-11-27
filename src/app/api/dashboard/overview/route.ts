import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient, type Prisma } from "@prisma/client";
import { getBandContext } from "@/lib/band-context";
import { taskAssigneeIds } from "@/lib/utils";

const prisma = new PrismaClient();
type OverviewGig = Prisma.GigGetPayload<{ include: { band: { select: { name: true } } } }>;
type RecentTask = Prisma.TaskGetPayload<{ include: { band: { select: { name: true } } } }> & { assignedName: string | null };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;


  // User-level data
  const myInvites = await prisma.bandInvite.findMany({
    where: { email: session.user.email || "" },
    include: { band: { select: { name: true } } }
  });

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  const myBands = await prisma.bandMember.findMany({
    where: { userId },
    include: { band: { include: { _count: { select: { members: true } } } } }
  });

  const bandIds = myBands.map(b => b.bandId);
  const hasBand = bandIds.length > 0;

  let nextGigs: OverviewGig[] = [];
  let recentTasks: RecentTask[] = [];
  const totalStats = { members: 0, songs: 0, gear: 0 };

  const activeContext = await getBandContext(userId);

  if (activeContext) {
    const activeBandId = activeContext.bandId;
    const isBandAdmin = activeContext.bandRole === "ADMIN";
    nextGigs = await prisma.gig.findMany({
      where: { bandId: { in: bandIds }, date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      orderBy: { date: "asc" },
      take: 5,
      include: { band: { select: { name: true } } }
    });

    const openTasks = await prisma.task.findMany({
      where: {
        bandId: activeBandId,
        status: { not: "COMPLETED" },
        ...(isBandAdmin ? {} : { assignedTo: { contains: userId } }),
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { band: { select: { name: true } } }
    });

    const uniqueMembers = await prisma.bandMember.findMany({
      where: { bandId: activeBandId },
      select: { userId: true, user: { select: { name: true } } },
      distinct: ['userId']
    });
    totalStats.members = uniqueMembers.length;

    const visibleTasks = isBandAdmin
      ? openTasks
      : openTasks.filter((task) => taskAssigneeIds(task.assignedTo).includes(userId));
    recentTasks = visibleTasks.map(task => {
      let assignedNames = null;
      if (task.assignedTo) {
        assignedNames = taskAssigneeIds(task.assignedTo).map((id) => {
          const member = uniqueMembers.find(m => m.userId === id);
          return member?.user?.name || "Unknown User";
        }).join(', ');
      }
      return {
        ...task,
        assignedName: assignedNames
      };
    });

    totalStats.songs = await prisma.song.count({ where: { bandId: activeBandId } });
    totalStats.gear = await prisma.gear.count({ where: { bandId: activeBandId } });
  }

  return NextResponse.json({
    hasBand,
    bands: myBands.map(b => ({ id: b.bandId, name: b.band.name, role: b.bandRole, memberCount: b.band._count.members })),
    myInvites,
    notifications,
    nextGigs,
    recentTasks,
    totalStats
  });
}
