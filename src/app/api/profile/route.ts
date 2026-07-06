import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { 
      name: true, 
      email: true, 
      availability: true, 
      image: true,
      coverImage: true,
      phone: true,
      bio: true,
      bandMembers: {
        include: { band: { select: { name: true, description: true } } }
      }
    }
  });

  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, availability, image, coverImage, phone, bio } = await req.json();

    const dataToUpdate: any = { name, availability, phone, bio };
    if (image !== undefined) dataToUpdate.image = image;
    if (coverImage !== undefined) dataToUpdate.coverImage = coverImage;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Profile update error", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
