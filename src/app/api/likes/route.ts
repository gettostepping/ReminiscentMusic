import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
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

    const searchParams = req.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')

    const likes = await prisma.trackLike.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        track: {
          include: {
            artist: {
              select: {
                id: true,
                uid: true,
                name: true,
                image: true
              }
            }
          }
        }
      }
    })

    // Process both regular and SoundCloud likes
    const processedLikes = likes.map(like => {
      if (like.trackId && like.track) {
        // Regular track
        return {
          ...like.track,
          likeCount: 0, // Will be filled from _count if available
          commentCount: 0,
          repostCount: 0,
          likedAt: like.createdAt
        }
      } else if (like.soundcloudTrackId) {
        // SoundCloud track
        return {
          id: `soundcloud_${like.soundcloudTrackId}`,
          title: like.soundcloudTitle || 'Unknown Track',
          description: null,
          audioUrl: like.soundcloudAudioUrl || '',
          artworkUrl: like.soundcloudArtworkUrl,
          duration: like.soundcloudDuration || null,
          genre: null,
          artist: {
            id: undefined,
            uid: undefined,
            name: like.soundcloudArtist || 'Unknown Artist',
            image: null,
            username: null,
            permalink: null,
            soundcloudUrl: like.soundcloudSourceUrl ? like.soundcloudSourceUrl.split('/').slice(0, -1).join('/') : null
          },
          isSoundCloud: true,
          sourceUrl: like.soundcloudSourceUrl,
          soundcloudId: like.soundcloudTrackId,
          likeCount: 0,
          commentCount: 0,
          repostCount: 0, // SoundCloud tracks don't have reposts
          playCount: 0,
          likedAt: like.createdAt
        }
      }
      return null
    }).filter(Boolean)

    // Get _count for regular tracks
    const regularLikes = likes.filter(like => like.trackId && like.track)
    if (regularLikes.length > 0) {
      const trackIds = regularLikes.map(like => like.trackId).filter(Boolean) as string[]
      const tracksWithCounts = await prisma.track.findMany({
        where: { id: { in: trackIds } },
        include: {
          _count: {
            select: {
              likes: true,
              comments: true,
              reposts: true
            }
          }
        }
      })
      
      const countsMap = new Map(tracksWithCounts.map(t => [t.id, t._count]))
      processedLikes.forEach(like => {
        if (like && !like.isSoundCloud && like.id) {
          const counts = countsMap.get(like.id)
          if (counts) {
            like.likeCount = counts.likes
            like.commentCount = counts.comments
            // Only set repostCount for regular tracks (not SoundCloud tracks)
            if (!like.isSoundCloud) {
              like.repostCount = counts.reposts
            }
          }
        }
      })
    }

    return NextResponse.json({
      likes: processedLikes,
      total: await prisma.trackLike.count({ where: { userId: user.id } })
    })
  } catch (error) {
    console.error('Error fetching likes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

