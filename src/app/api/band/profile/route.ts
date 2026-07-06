import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getBandContext } from "@/lib/band-context";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Require ADMIN role to edit band profile
  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) return NextResponse.json({ error: "Forbidden - Admins only" }, { status: 403 });

  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const location = formData.get("location") as string;
    const genres = formData.get("genres") as string;
    const instagram = formData.get("instagram") as string;
    const spotify = formData.get("spotify") as string;
    const youtube = formData.get("youtube") as string;
    const website = formData.get("website") as string;

    const logoFile = formData.get("logoFile") as File;
    const coverFile = formData.get("coverFile") as File;

    const uploadDir = path.join(process.cwd(), "public/uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let logoUrl = undefined;
    if (logoFile && logoFile.size > 0) {
      const ext = path.extname(logoFile.name) || ".jpg";
      const fileName = `band_${bandMember.bandId}_logo_${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, fileName);
      const buffer = Buffer.from(await logoFile.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      logoUrl = `/uploads/${fileName}`;
    }

    let coverUrl = undefined;
    if (coverFile && coverFile.size > 0) {
      const ext = path.extname(coverFile.name) || ".jpg";
      const fileName = `band_${bandMember.bandId}_cover_${Date.now()}${ext}`;
      const filePath = path.join(uploadDir, fileName);
      const buffer = Buffer.from(await coverFile.arrayBuffer());
      fs.writeFileSync(filePath, buffer);
      coverUrl = `/uploads/${fileName}`;
    }

    const removeLogo = formData.get("removeLogo") === "true";
    const removeCover = formData.get("removeCover") === "true";

    const updateData: any = {
      name,
      description,
      location,
      genres,
      instagram,
      spotify,
      youtube,
      website
    };
    if (logoUrl) updateData.logoUrl = logoUrl;
    else if (removeLogo) updateData.logoUrl = null;

    if (coverUrl) updateData.coverUrl = coverUrl;
    else if (removeCover) updateData.coverUrl = null;

    const updatedBand = await prisma.band.update({
      where: { id: bandMember.bandId },
      data: updateData
    });

    return NextResponse.json(updatedBand);
  } catch (error) {
    console.error("Failed to update band profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { compare } from "bcrypt";
import { cookies } from "next/headers";

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) return NextResponse.json({ error: "Forbidden - Admins only" }, { status: 403 });

  try {
    const { password } = await req.json();
    if (!password) {
      return NextResponse.json({ error: "Password is required to disband the band" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: "Account error, cannot verify password" }, { status: 400 });
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    // Get all members before deleting
    const members = await prisma.bandMember.findMany({
      where: { bandId: bandMember.bandId }
    });

    const bandName = bandMember.band.name;

    // Delete the band. Cascade delete will handle related records.
    await prisma.band.delete({
      where: { id: bandMember.bandId }
    });

    // Notify members
    const notifications = members
      .filter(m => m.userId !== session.user.id) // Optionally don't notify the admin who deleted it
      .map(m => ({
        userId: m.userId,
        title: "Band Disbanded",
        message: `The band "${bandName}" has been disbanded by an admin.`
      }));
    
    if (notifications.length > 0) {
      await prisma.notification.createMany({
        data: notifications
      });
    }

    // Clear the active band cookie so they aren't stuck on a deleted band
    const cookieStore = await cookies();
    cookieStore.delete("activeBandId");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete band:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id);
  if (!bandMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const band = await prisma.band.findUnique({
    where: { id: bandMember.bandId }
  });

  return NextResponse.json({ band, role: bandMember.bandRole });
}
