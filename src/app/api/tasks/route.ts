import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { getBandContext } from "@/lib/band-context";
import { toTitleCase } from "@/lib/utils";

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id);
  if (!bandMember) return NextResponse.json({ error: "No band found" }, { status: 404 });

  const tasks = await prisma.task.findMany({
    where: { bandId: bandMember.bandId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);

  if (!bandMember) {
    return NextResponse.json({ error: "Forbidden: Only admins can create tasks" }, { status: 403 });
  }

  try {
    const { title, assignedTo, dueDate } = await req.json();

    const task = await prisma.task.create({
      data: {
        title: toTitleCase(title),
        assignedTo: assignedTo, // Stores comma separated user IDs
        dueDate: dueDate ? new Date(dueDate) : null,
        bandId: bandMember.bandId,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    console.error("Task error", error);
    return NextResponse.json({ error: "Failed to create task: " + (error.message || error) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id);
  if (!bandMember) return NextResponse.json({ error: "No band found" }, { status: 404 });

  try {
    const { taskId, status } = await req.json();

    // Verify task belongs to band
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!existingTask || existingTask.bandId !== bandMember.bandId) {
       return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const isAssigned = existingTask.assignedTo?.split(',').includes(session.user.id);
    if (bandMember.bandRole !== "ADMIN" && !isAssigned) {
       return NextResponse.json({ error: "Forbidden: Only admins and assigned members can update task progress" }, { status: 403 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status }
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Task update error", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) return NextResponse.json({ error: "Forbidden: Only admins can edit tasks" }, { status: 403 });

  try {
    const { taskId, title, assignedTo, dueDate } = await req.json();

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask || existingTask.bandId !== bandMember.bandId) {
       return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: toTitleCase(title),
        assignedTo: assignedTo,
        dueDate: dueDate ? new Date(dueDate) : null,
      }
    });

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error("Task edit error", error);
    return NextResponse.json({ error: "Failed to edit task: " + (error.message || error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const bandMember = await getBandContext(session.user.id, true);
  if (!bandMember) return NextResponse.json({ error: "Forbidden: Only admins can delete tasks" }, { status: 403 });

  try {
    const { taskId } = await req.json();

    const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
    if (!existingTask || existingTask.bandId !== bandMember.bandId) {
       return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({
      where: { id: taskId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Task delete error", error);
    return NextResponse.json({ error: "Failed to delete task: " + (error.message || error) }, { status: 500 });
  }
}
