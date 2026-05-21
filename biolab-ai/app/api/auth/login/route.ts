import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { comparePassword, issueAccessToken, issueRefreshToken, hashToken, type TokenPayload } from "@/lib/auth";
import { AUTH_COOKIE_OPTIONS, REFRESH_TOKEN_MAX_AGE, ACCESS_TOKEN_MAX_AGE } from "@/lib/constants";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    // Read raw body for debugging and robust parsing
    try {
        const raw = await request.text();
        let body: Record<string, unknown> | null = null;
        try {
            body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch (err) {
            console.error('Invalid JSON body received at /api/auth/login:', raw);
            return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
        }
        const email = typeof body?.email === 'string' ? body.email : '';
        const password = typeof body?.password === 'string' ? body.password : '';

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json({ error: "Unregistered email." }, { status: 401 });
        }

        const passwordValid = await comparePassword(password, user.password_hash);
        if (!passwordValid) {
            return NextResponse.json({ error: "Wrong password." }, { status: 401 });
        }

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
        console.error('Login route error:', err);
        return NextResponse.json({ error: 'Server error.' }, { status: 500 });
    }
}