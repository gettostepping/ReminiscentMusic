import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Record a track play in listening history
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
    const { trackId, isSoundCloud, title, artist, artworkUrl, audioUrl, sourceUrl, duration } = body

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 })
    }

    if (isSoundCloud) {
      // Handle SoundCloud tracks
      const existingEntry = await prisma.listeningHistory.findFirst({
        where: {
          userId: user.id,
          soundcloudTrackId: trackId
        }
      })

      if (existingEntry) {
        // Update the playedAt timestamp
        await prisma.listeningHistory.update({
          where: {
            id: existingEntry.id
          },
          data: {
            playedAt: new Date()
          }
        })
      } else {
        // Create new entry
        await prisma.listeningHistory.create({
          data: {
            userId: user.id,
            soundcloudTrackId: trackId,
            soundcloudTitle: title,
            soundcloudArtist: artist,
            soundcloudArtworkUrl: artworkUrl,
            soundcloudAudioUrl: audioUrl,
            soundcloudSourceUrl: sourceUrl,
            soundcloudDuration: duration ? Math.floor(duration) : null
          }
        })
      }
    } else {
      // Handle regular tracks
      const existingEntry = await prisma.listeningHistory.findFirst({
        where: {
          userId: user.id,
          trackId: trackId
        }
      })

      if (existingEntry) {
        // Update the playedAt timestamp
        await prisma.listeningHistory.update({
          where: {
            id: existingEntry.id
          },
          data: {
            playedAt: new Date()
          }
        })
      } else {
        // Create new entry
        await prisma.listeningHistory.create({
          data: {
            userId: user.id,
            trackId
          }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error recording listening history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get listening history
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
    const limit = parseInt(searchParams.get('limit') || '50')

    // Get all history entries (both regular and SoundCloud tracks)
    const allHistory = await prisma.listeningHistory.findMany({
      where: { userId: user.id },
      orderBy: { playedAt: 'desc' },
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
            },
            _count: {
              select: {
                likes: true,
                comments: true,
                reposts: true
              }
            }
          }
        }
      }
    })

    // Get unique tracks (most recent play of each track)
    const uniqueTracksMap = new Map()
    allHistory.forEach(entry => {
      const trackId = entry.trackId || entry.soundcloudTrackId
      if (!trackId) return

      if (!uniqueTracksMap.has(trackId) || 
          new Date(entry.playedAt) > new Date(uniqueTracksMap.get(trackId).playedAt)) {
        
        // Handle SoundCloud tracks
        if (entry.soundcloudTrackId) {
          uniqueTracksMap.set(trackId, {
            id: entry.id,
            playedAt: entry.playedAt,
            track: {
              id: `soundcloud_${entry.soundcloudTrackId}`,
              title: entry.soundcloudTitle || 'Unknown Track',
              artworkUrl: entry.soundcloudArtworkUrl,
              audioUrl: entry.soundcloudAudioUrl,
              duration: entry.soundcloudDuration || null,
              artist: {
                name: entry.soundcloudArtist || 'Unknown Artist',
                username: null,
                permalink: null,
                soundcloudUrl: entry.soundcloudSourceUrl ? entry.soundcloudSourceUrl.split('/').slice(0, -1).join('/') : null
              },
              isSoundCloud: true,
              sourceUrl: entry.soundcloudSourceUrl,
              soundcloudId: entry.soundcloudTrackId,
              likeCount: 0,
              commentCount: 0,
              playCount: 0
            }
          })
        } else if (entry.track) {
          // Handle regular tracks
          uniqueTracksMap.set(trackId, {
            id: entry.id,
            playedAt: entry.playedAt,
            track: {
              ...entry.track,
              likeCount: entry.track._count.likes,
              commentCount: entry.track._count.comments,
              repostCount: entry.track._count.reposts
            }
          })
        }
      }
    })

    // Convert to array and sort by most recent play
    const uniqueHistory = Array.from(uniqueTracksMap.values())
      .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
      .slice(0, limit)

    // Get recently played tracks (unique, ordered by most recent)
    const recentlyPlayed = uniqueHistory.map(entry => entry.track)

    return NextResponse.json({
      history: uniqueHistory,
      recentlyPlayed
    })
  } catch (error) {
    console.error('Error fetching listening history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

