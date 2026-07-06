import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getBandContext } from "@/lib/band-context";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const bandMember = await getBandContext(session.user.id);
    if (!bandMember) return NextResponse.json({ role: "MUSICIAN" });

    return NextResponse.json({ 
      role: bandMember.bandRole, 
      bandId: bandMember.bandId, 
      bandName: bandMember.band.name,
      userId: session.user.id
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch role" }, { status: 500 });
  }
}
