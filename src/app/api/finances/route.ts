import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getBandContext } from "@/lib/band-context";

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id);
  if (!bandMember) return NextResponse.json({ error: "No band found" }, { status: 404 });

  const transactions = await prisma.financeTransaction.findMany({
    where: { bandId: bandMember.bandId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(transactions);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);

  if (!bandMember) {
    return NextResponse.json({ error: "Forbidden: Only admins can add financial records" }, { status: 403 });
  }

  try {
    const { type, amount, description, date } = await req.json();

    const transaction = await prisma.financeTransaction.create({
      data: {
        type,
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : new Date(),
        bandId: bandMember.bandId,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Finance error", error);
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id, type, amount, description } = await req.json();

    const existingTx = await prisma.financeTransaction.findUnique({ where: { id } });
    if (!existingTx || existingTx.bandId !== bandMember.bandId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updatedTx = await prisma.financeTransaction.update({
      where: { id },
      data: {
        type,
        amount: parseFloat(amount),
        description,
      }
    });

    return NextResponse.json(updatedTx);
  } catch (error) {
    console.error("Finance update error", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await req.json();

    const existingTx = await prisma.financeTransaction.findUnique({ where: { id } });
    if (!existingTx || existingTx.bandId !== bandMember.bandId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.financeTransaction.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Finance delete error", error);
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
}
