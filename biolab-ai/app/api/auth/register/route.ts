import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, issueAccessToken, issueRefreshToken, hashToken, type TokenPayload } from "@/lib/auth";
import { AUTH_COOKIE_OPTIONS, REFRESH_TOKEN_MAX_AGE, ACCESS_TOKEN_MAX_AGE } from "@/lib/constants";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const { name, email, department, institution, role, inviteCode, password } = await request.json();
        const normalizedRole = (typeof role === "string" ? role.toLowerCase() : "researcher") as "researcher" | "lab_head" | "admin";

        // Validate role values
        if (!["researcher", "lab_head", "admin"].includes(normalizedRole)) {
            return NextResponse.json({ error: "Invalid role selected." }, { status: 400 });
        }

        // Validate invite code for admin/lab head roles
        if ((normalizedRole === "admin" || normalizedRole === "lab_head") && inviteCode !== process.env.ADMIN_INVITE_CODE) {
            return NextResponse.json({ error: "Invalid invite code." }, { status: 401 });
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return NextResponse.json({ error: "Email already in use." }, { status: 409 });
        }

        // Create user
        const passwordHash = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password_hash: passwordHash,
                department,
                institution,
                role: normalizedRole,
            },
        });

        const payload: TokenPayload = { userId: user.id, email: user.email, role: user.role };
        const accessToken = await issueAccessToken(payload);
        const refreshToken = await issueRefreshToken(payload);
        const hashedRefreshToken = await hashToken(refreshToken);

        const ipAddress = request.headers.get("x-forwarded-for") ?? "";
        await prisma.session.create({
            data: {
                user_id: user.id,
                token: hashedRefreshToken,
                expires_at: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000),
                ip_address: ipAddress,
                user_agent: request.headers.get("user-agent") ?? "",
            },
        });

        const response = NextResponse.json({ success: true });
        response.cookies.set("access_token", accessToken, {
            ...AUTH_COOKIE_OPTIONS,
            maxAge: ACCESS_TOKEN_MAX_AGE,
        });
        response.cookies.set("refresh_token", refreshToken, {
            ...AUTH_COOKIE_OPTIONS,
            maxAge: REFRESH_TOKEN_MAX_AGE,
        });

        return response;
    } catch (err) {
        console.error('Register route error:', err);
        return NextResponse.json({ error: 'Server error.' }, { status: 500 });
    }
}