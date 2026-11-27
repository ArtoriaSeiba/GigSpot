import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBandContext } from "@/lib/band-context";

export async function songEditorAccess() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { error: Response.json({ error: "Sign in to continue." }, { status: 401 }) } as const;
  const membership = await getBandContext(userId);
  if (membership?.bandRole !== "ADMIN") {
    return { error: Response.json({ error: "Only band admins can edit songs." }, { status: 403 }) } as const;
  }
  return { userId, bandId: membership.bandId } as const;
}
