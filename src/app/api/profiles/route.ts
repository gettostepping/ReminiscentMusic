import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const uid = searchParams.get('uid')
    const email = searchParams.get('email')

    if (!uid && !email) {
      return NextResponse.json({ error: 'UID or email is required' }, { status: 400 })
    }

    // Find user by UID (numeric) or email
    const whereClause = uid 
      ? (isNaN(parseInt(uid)) ? { email: uid } : { uid: parseInt(uid) })
      : { email: email! }

    const user = await prisma.user.findUnique({
      where: whereClause,
      include: {
        profile: true,
        _count: {
          select: {
            followers: true,
            following: true,
            tracks: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const session = await getServerSession(authOptions)
    let isFollowing = false

    if (session?.user?.email) {
      const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email }
      })

      if (currentUser && currentUser.id !== user.id) {
        const follow = await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUser.id,
              followingId: user.id
            }
          }
        })
        isFollowing = !!follow
      }
    }

    const tracks = await prisma.track.findMany({
      where: {
        artistId: user.id,
        isPublic: true
      },
      orderBy: { createdAt: 'desc' },
      include: {
        artist: {
          select: {
            id: true,
            uid: true,
            name: true,
            image: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            reposts: true
          }
        }
      }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        uid: user.uid,
        name: user.name,
        image: user.image,
        banner: user.banner,
        profile: user.profile,
        followerCount: user._count.followers,
        followingCount: user._count.following,
        trackCount: user._count.tracks,
        isFollowing
      },
      tracks: tracks.map(track => ({
        ...track,
        likeCount: track._count.likes,
        commentCount: track._count.comments,
        repostCount: track._count.reposts,
        playCount: track.playCount || 0
      }))
    })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

