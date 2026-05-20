import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type TokenPayload } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function POST(request: NextRequest) {
    const token = request.cookies.get("access_token")?.value;

    if (!token) {
        return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    try {
        const payload = await verifyAccessToken(token);
        const { alertId } = await request.json();

        // Dismiss alert logic would go here
        // For now, just return success
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: "Invalid token." }, { status: 401 });
    }
}