import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_MAX_AGE, REFRESH_TOKEN_MAX_AGE } from "@/lib/constants";

const accessTokenSecret = process.env.JWT_ACCESS_SECRET ?? "dev-access-secret";
const refreshTokenSecret = process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret";

export interface TokenPayload {
    userId: string;
    role: string;
    email: string;
}

export function hashPassword(password: string) {
    return bcrypt.hash(password, 12);
}

export function comparePassword(password: string, hashed: string) {
    return bcrypt.compare(password, hashed);
}

export function issueAccessToken(payload: TokenPayload) {
    return jwt.sign(payload, accessTokenSecret, {
        algorithm: "HS256",
        expiresIn: `${ACCESS_TOKEN_MAX_AGE}s`,
    });
}

export function issueRefreshToken(payload: TokenPayload) {
    return jwt.sign(payload, refreshTokenSecret, {
        algorithm: "HS256",
        expiresIn: `${REFRESH_TOKEN_MAX_AGE}s`,
    });
}

export function verifyAccessToken(token: string) {
    return jwt.verify(token, accessTokenSecret) as TokenPayload;
}

export function verifyRefreshToken(token: string) {
    return jwt.verify(token, refreshTokenSecret) as TokenPayload;
}

export function hashToken(token: string) {
    return bcrypt.hash(token, 12);
}

export function compareToken(token: string, hashed: string) {
    return bcrypt.compare(token, hashed);
}
