import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Create in-app notifications for all members of a band (optionally excluding the actor). */
export async function notifyBandMembers({
  bandId,
  excludeUserId,
  title,
  message,
}: {
  bandId: string;
  excludeUserId?: string;
  title: string;
  message: string;
}) {
  try {
    const members = await prisma.bandMember.findMany({
      where: { bandId },
      select: { userId: true },
    });

    const recipients = members
      .map((m) => m.userId)
      .filter((id) => id !== excludeUserId);

    if (recipients.length === 0) return;

    await prisma.notification.createMany({
      data: recipients.map((userId) => ({
        userId,
        title,
        message,
      })),
    });
  } catch (error) {
    console.error("Failed to notify band members:", error);
  }
}

