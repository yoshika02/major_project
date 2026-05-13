import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, issueAccessToken, issueRefreshToken, hashToken, type TokenPayload } from "@/lib/auth";
import { AUTH_COOKIE_OPTIONS, REFRESH_TOKEN_MAX_AGE, ACCESS_TOKEN_MAX_AGE, ADMIN_INVITE_ENV } from "@/lib/constants";

export async function POST(request: NextRequest) {
    const { name, email, department, institution, role, inviteCode, password } = await request.json();

    if (role === "admin" && inviteCode !== process.env[ADMIN_INVITE_ENV]) {
        return NextResponse.json({ error: "Admin invite code is invalid." }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
    }

    const password_hash = await hashPassword(password);
    const user = await prisma.user.create({
        data: {
            name,
            email,
            password_hash,
            role,
            department,
            institution,
        },
    });

    const payload: TokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = issueAccessToken(payload);
    const refreshToken = issueRefreshToken(payload);
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
}
