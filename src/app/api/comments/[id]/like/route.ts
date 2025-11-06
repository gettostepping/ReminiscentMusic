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

    const existingLike = await prisma.trackCommentLike.findUnique({
      where: {
        commentId_userId: {
          commentId: params.id,
          userId: user.id
        }
      }
    })

    if (existingLike) {
      await prisma.trackCommentLike.delete({
        where: {
          commentId_userId: {
            commentId: params.id,
            userId: user.id
          }
        }
      })

      await prisma.trackComment.update({
        where: { id: params.id },
        data: { likes: { decrement: 1 } }
      })

      return NextResponse.json({ liked: false })
    } else {
      await prisma.trackCommentLike.create({
        data: {
          commentId: params.id,
          userId: user.id
        }
      })

      await prisma.trackComment.update({
        where: { id: params.id },
        data: { likes: { increment: 1 } }
      })

      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error('Error toggling comment like:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

