import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function getBandContext(userId: string, requireAdmin = false) {
  const cookieStore = await cookies();
  const activeBandId = cookieStore.get("activeBandId")?.value;

  const whereClause: any = { userId };
  if (requireAdmin) whereClause.bandRole = "ADMIN";

  if (activeBandId) {
    const member = await prisma.bandMember.findFirst({
      where: { ...whereClause, bandId: activeBandId },
      include: { band: true }
    });
    if (member) return member;
  }

  // Fallback to the first available band if no activeBandId or if it is invalid
  const bandMember = await prisma.bandMember.findFirst({
    where: whereClause,
    include: { band: true }
  });

  return bandMember;
}
