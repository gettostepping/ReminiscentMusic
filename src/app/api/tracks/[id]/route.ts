import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if this is a SoundCloud track (ID starts with "soundcloud_")
    const isSoundCloudTrack = params.id.startsWith('soundcloud_')
    
    if (isSoundCloudTrack) {
      // Handle SoundCloud track
      const soundcloudId = params.id.replace('soundcloud_', '')
      
      // Get session for like status
      const session = await getServerSession(authOptions)
      let isLiked = false
      
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email }
        })

        if (user) {
          const like = await prisma.trackLike.findFirst({
            where: {
              soundcloudTrackId: soundcloudId,
              userId: user.id
            }
          })
          isLiked = !!like
        }
      }

      // Get the SoundCloud track data from TrackLike
      const like = await prisma.trackLike.findFirst({
        where: {
          soundcloudTrackId: soundcloudId
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      if (!like || !like.soundcloudTrackId) {
        return NextResponse.json({ error: 'SoundCloud track not found' }, { status: 404 })
      }

      // Count total likes for this SoundCloud track
      const likeCount = await prisma.trackLike.count({
        where: {
          soundcloudTrackId: soundcloudId
        }
      })

      // Build SoundCloud track object
      const soundcloudTrack = {
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
        likeCount: likeCount,
        commentCount: 0, // SoundCloud tracks don't have comments in our system
        repostCount: 0, // SoundCloud tracks don't have reposts
        playCount: 0, // We don't track play count for SoundCloud tracks
        isLiked,
        isReposted: false,
        createdAt: like.createdAt,
        updatedAt: like.createdAt
      }

      return NextResponse.json({
        track: soundcloudTrack
      })
    }

    // Handle regular track
    const track = await prisma.track.findUnique({
      where: { id: params.id },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            image: true,
            uid: true
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

    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    // Increment play count
    await prisma.track.update({
      where: { id: params.id },
      data: { playCount: { increment: 1 } }
    })

    const session = await getServerSession(authOptions)
    let isLiked = false
    let isReposted = false

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })

      if (user) {
        const like = await prisma.trackLike.findUnique({
          where: {
            trackId_userId: {
              trackId: params.id,
              userId: user.id
            }
          }
        })
        isLiked = !!like

        const repost = await prisma.repost.findUnique({
          where: {
            userId_trackId: {
              userId: user.id,
              trackId: params.id
            }
          }
        })
        isReposted = !!repost
      }
    }

    return NextResponse.json({
      track: {
        ...track,
        likeCount: track._count.likes,
        commentCount: track._count.comments,
        repostCount: track._count.reposts,
        isLiked,
        isReposted
      }
    })
  } catch (error) {
    console.error('Error fetching track:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    if (track.artistId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.track.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting track:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

