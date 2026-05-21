import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const token = request.cookies.get("access_token")?.value;

    if (!token) {
        return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    try {
        const payload = await verifyAccessToken(token);
        const logs = await prisma.activityLog.findMany({
            where: { user_id: payload.userId },
            orderBy: { created_at: "desc" },
            take: 10,
        });
        return NextResponse.json({ logs });
    } catch {
        return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }
}