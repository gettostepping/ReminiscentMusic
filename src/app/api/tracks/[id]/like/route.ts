import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const track = await prisma.track.findUnique({
      where: { id: params.id }
    })

    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    const existingLike = await prisma.trackLike.findUnique({
      where: {
        trackId_userId: {
          trackId: params.id,
          userId: user.id
        }
      }
    })

    if (existingLike) {
      await prisma.trackLike.delete({
        where: {
          trackId_userId: {
            trackId: params.id,
            userId: user.id
          }
        }
      })

      await prisma.track.update({
        where: { id: params.id },
        data: { likeCount: { decrement: 1 } }
      })

      return NextResponse.json({ liked: false })
    } else {
      await prisma.trackLike.create({
        data: {
          trackId: params.id,
          userId: user.id
        }
      })

      await prisma.track.update({
        where: { id: params.id },
        data: { likeCount: { increment: 1 } }
      })

      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error('Error toggling like:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

