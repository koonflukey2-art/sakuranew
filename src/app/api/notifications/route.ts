import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const notifications = await prisma.notification.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const notification = await prisma.notification.update({
      where: { id: body.id },
      data: { isRead: true },
    });
    return NextResponse.json(notification);
  } catch (error) {
    console.error("Failed to update notification:", error);
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const notification = await prisma.notification.create({
      data: {
        userId: body.userId,
        type: body.type,
        message: body.message,
        link: body.link,
      },
    });
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return NextResponse.json(
      { error: "Failed to create notification" },
      { status: 500 }
    );
  }
}
