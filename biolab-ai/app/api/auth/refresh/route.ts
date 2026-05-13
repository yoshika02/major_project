import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { compareToken, issueAccessToken, issueRefreshToken, verifyRefreshToken, hashToken, type TokenPayload } from "@/lib/auth";
import { AUTH_COOKIE_OPTIONS, ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from "@/lib/constants";

export async function POST(request: NextRequest) {
    const refreshCookie = request.cookies.get("refresh_token")?.value;
    if (!refreshCookie) {
        return NextResponse.json({ error: "Refresh token missing." }, { status: 401 });
    }

    let payload: TokenPayload;
    try {
        payload = verifyRefreshToken(refreshCookie);
    } catch {
        return NextResponse.json({ error: "Invalid refresh token." }, { status: 401 });
    }

    const session = await prisma.session.findFirst({
        where: { user_id: payload.userId },
        orderBy: { created_at: "desc" },
    });

    if (!session || !(await compareToken(refreshCookie, session.token))) {
        return NextResponse.json({ error: "Refresh token not recognized." }, { status: 401 });
    }

    const newAccessToken = issueAccessToken(payload);
    const newRefreshToken = issueRefreshToken(payload);
    const hashedRefreshToken = await hashToken(newRefreshToken);
    const ipAddress = request.headers.get("x-forwarded-for") ?? "";

    await prisma.session.create({
        data: {
            user_id: payload.userId,
            token: hashedRefreshToken,
            expires_at: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE * 1000),
            ip_address: ipAddress,
            user_agent: request.headers.get("user-agent") ?? "",
        },
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set("access_token", newAccessToken, {
        ...AUTH_COOKIE_OPTIONS,
        maxAge: ACCESS_TOKEN_MAX_AGE,
    });
    response.cookies.set("refresh_token", newRefreshToken, {
        ...AUTH_COOKIE_OPTIONS,
        maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    return response;
}
