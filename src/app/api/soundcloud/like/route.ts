import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
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
    const { trackId, title, artist, artworkUrl, audioUrl, sourceUrl, duration } = body

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 })
    }

    // Check if like already exists
    const existingLike = await prisma.trackLike.findUnique({
      where: {
        soundcloudTrackId_userId: {
          soundcloudTrackId: trackId,
          userId: user.id
        }
      }
    })

    if (existingLike) {
      // Unlike - delete the existing like
      await prisma.trackLike.delete({
        where: {
          soundcloudTrackId_userId: {
            soundcloudTrackId: trackId,
            userId: user.id
          }
        }
      })

      return NextResponse.json({ liked: false })
    } else {
      // Like - create new like entry
      // If metadata is provided, use it; otherwise try to get from existing like
      let trackData = {
        soundcloudTrackId: trackId,
        userId: user.id,
        soundcloudTitle: title || null,
        soundcloudArtist: artist || null,
        soundcloudArtworkUrl: artworkUrl || null,
        soundcloudAudioUrl: audioUrl || null,
        soundcloudSourceUrl: sourceUrl || null,
        soundcloudDuration: duration ? Math.floor(duration) : null
      }

      // If metadata wasn't provided, try to get it from an existing like by another user
      if (!title || !artist) {
        const anyLike = await prisma.trackLike.findFirst({
          where: {
            soundcloudTrackId: trackId
          },
          orderBy: {
            createdAt: 'desc'
          }
        })
        
        if (anyLike) {
          trackData.soundcloudTitle = trackData.soundcloudTitle || anyLike.soundcloudTitle
          trackData.soundcloudArtist = trackData.soundcloudArtist || anyLike.soundcloudArtist
          trackData.soundcloudArtworkUrl = trackData.soundcloudArtworkUrl || anyLike.soundcloudArtworkUrl
          trackData.soundcloudSourceUrl = trackData.soundcloudSourceUrl || anyLike.soundcloudSourceUrl
          trackData.soundcloudDuration = trackData.soundcloudDuration || anyLike.soundcloudDuration
        }
      }

      await prisma.trackLike.create({
        data: trackData
      })

      return NextResponse.json({ liked: true })
    }
  } catch (error) {
    console.error('Error toggling SoundCloud like:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const trackId = searchParams.get('trackId')

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const like = await prisma.trackLike.findUnique({
      where: {
        soundcloudTrackId_userId: {
          soundcloudTrackId: trackId,
          userId: user.id
        }
      }
    })

    return NextResponse.json({ isLiked: !!like })
  } catch (error) {
    console.error('Error checking SoundCloud like:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

