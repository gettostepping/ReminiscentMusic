import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const comments = await prisma.trackComment.findMany({
      where: { trackId: params.id },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            uid: true
          }
        },
        _count: {
          select: {
            likedBy: true
          }
        }
      }
    })

    const session = await getServerSession(authOptions)
    let likedCommentIds: string[] = []

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })

      if (user) {
        const likes = await prisma.trackCommentLike.findMany({
          where: {
            userId: user.id,
            commentId: { in: comments.map(c => c.id) }
          },
          select: { commentId: true }
        })
        likedCommentIds = likes.map(l => l.commentId)
      }
    }

    const commentsWithLikes = comments.map(comment => ({
      ...comment,
      likeCount: comment._count.likedBy,
      isLiked: likedCommentIds.includes(comment.id)
    }))

    return NextResponse.json({ comments: commentsWithLikes })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const body = await req.json()
    const { body: commentBody, timestamp } = body

    if (!commentBody || commentBody.trim().length === 0) {
      return NextResponse.json({ error: 'Comment body is required' }, { status: 400 })
    }

    const comment = await prisma.trackComment.create({
      data: {
        trackId: params.id,
        authorId: user.id,
        body: commentBody,
        timestamp: timestamp || null
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            uid: true
          }
        }
      }
    })

    return NextResponse.json({ comment: { ...comment, likeCount: 0, isLiked: false } })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

