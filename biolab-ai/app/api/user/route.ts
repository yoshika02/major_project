import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyAccessToken, comparePassword, hashPassword, type TokenPayload } from "@/lib/auth";

async function requireUser(request: NextRequest) {
    const accessToken = request.cookies.get("access_token")?.value;
    if (!accessToken) {
        throw new Error("Unauthorized");
    }
    return verifyAccessToken(accessToken);
}

export async function GET(request: NextRequest) {
    try {
        const payload = await requireUser(request);
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { name: true, email: true, department: true, institution: true, role: true },
        });
        if (!user) {
            return NextResponse.json({ error: "User not found." }, { status: 404 });
        }
        return NextResponse.json({ user });
    } catch {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const payload = await requireUser(request);
        const body = await request.json();
        const updates: Record<string, string> = {};

        if (body.name) updates.name = body.name;
        if (body.department) updates.department = body.department;
        if (body.institution) updates.institution = body.institution;

        if (body.currentPassword && body.newPassword) {
            const user = await prisma.user.findUnique({ where: { id: payload.userId } });
            if (!user || !(await comparePassword(body.currentPassword, user.password_hash))) {
                return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
            }
            updates.password_hash = await hashPassword(body.newPassword);
        }

        await prisma.user.update({
            where: { id: payload.userId },
            data: updates,
        });

        return NextResponse.json({ success: true, message: "Profile updated." });
    } catch (error) {
        return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
}
