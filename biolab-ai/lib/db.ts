import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Initialize Prisma Client - simple setup
function initPrismaClient() {
    if (!globalForPrisma.prisma) {
        globalForPrisma.prisma = new PrismaClient({
            errorFormat: 'pretty'
        })
    }
    return globalForPrisma.prisma
}

// Export prisma instance
export const prisma = (() => {
    try {
        return initPrismaClient()
    } catch (error) {
        console.error('Failed to initialize Prisma:', error)
        throw error
    }
})()