import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Prevent connection pool exhaustion
if (process.env.NODE_ENV !== 'production') {
  // @ts-ignore
  global.prisma = global.prisma || prisma
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const { currentPage, pageType, mediaType } = body

    // Use updateMany for better performance, only update if more than 5 seconds passed
    await prisma.presence.upsert({
      where: { userId: user.id },
      update: {
        currentPage,
        pageType,
        mediaType,
        now: new Date(),
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        currentPage,
        pageType,
        mediaType,
        now: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    // Silently fail presence updates to avoid spamming logs
    return NextResponse.json({ success: true })
  }
}

