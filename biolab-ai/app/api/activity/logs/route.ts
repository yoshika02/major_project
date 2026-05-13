import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
    try {
        const logs = await prisma.activityLog.findMany({
            take: 20,
            orderBy: { created_at: "desc" },
            include: { user: true },
        });

        const formattedLogs = logs.map((log) => ({
            id: log.id,
            user: log.user.name,
            action: log.action,
            module: log.module,
            time: formatTimeAgo(log.created_at),
        }));

        return NextResponse.json({ logs: formattedLogs });
    } catch (error) {
        console.error("Error fetching activity logs:", error);
        return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
    }
}

function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return "Just now";
}