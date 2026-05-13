import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { comparePassword, issueAccessToken, issueRefreshToken, hashToken, type TokenPayload } from "@/lib/auth";
import { AUTH_COOKIE_OPTIONS, REFRESH_TOKEN_MAX_AGE, ACCESS_TOKEN_MAX_AGE } from "@/lib/constants";

export async function POST(request: NextRequest) {
    const { email, password } = await request.json();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return NextResponse.json({ error: "Unregistered email." }, { status: 401 });
    }

    const passwordValid = await comparePassword(password, user.password_hash);
    if (!passwordValid) {
        return NextResponse.json({ error: "Wrong password." }, { status: 401 });
    }

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
