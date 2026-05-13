import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const { alertId } = await request.json();

        // Get user from token
        const accessToken = request.cookies.get("access_token")?.value;
        if (!accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = verifyAccessToken(accessToken);

        // Log dismissal
        await prisma.activityLog.create({
            data: {
                user_id: payload.userId,
                action: `dismissed alert: ${alertId}`,
                module: "Dashboard",
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error dismissing alert:", error);
        return NextResponse.json({ error: "Failed to dismiss alert" }, { status: 500 });
    }
}