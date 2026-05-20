import { PrismaClient } from '@prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { getRequestContext } from '@cloudflare/next-on-pages'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Lazy initialization - only called at runtime
export function getPrismaClient() {
    let dbBinding: any = null;
    
    try {
        // Try to get binding from Cloudflare Pages runtime
        dbBinding = getRequestContext().env.DB;
    } catch {
        // If not in a request context, try to fallback
    }

    if (!globalForPrisma.prisma) {
        if (dbBinding) {
            const adapter = new PrismaD1(dbBinding);
            globalForPrisma.prisma = new PrismaClient({ adapter });
        } else {
            console.warn("No D1 binding found, falling back to local Prisma Client");
            globalForPrisma.prisma = new PrismaClient();
        }
    } else if (dbBinding && !(globalForPrisma.prisma as any)._adapter) {
        // In case it was initialized without an adapter but now we have one
        const adapter = new PrismaD1(dbBinding);
        globalForPrisma.prisma = new PrismaClient({ adapter });
    }

    return globalForPrisma.prisma
}

// For compatibility, export as prisma
export const prisma = new Proxy({} as PrismaClient, {
    get: (target, prop) => {
        const client = getPrismaClient()
        return client[prop as keyof PrismaClient]
    },
})