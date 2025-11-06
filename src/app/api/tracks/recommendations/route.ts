import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const trackId = searchParams.get('trackId')
    const isSoundCloud = searchParams.get('isSoundCloud') === 'true'

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 })
    }

    // If it's a SoundCloud track, get general recommendations
    if (isSoundCloud || trackId.startsWith('soundcloud_')) {
      // Get popular tracks as recommendations for SoundCloud tracks
      const popularTracks = await prisma.track.findMany({
        where: {
          isPublic: true
        },
        take: 10,
        orderBy: [
          { playCount: 'desc' },
          { likeCount: 'desc' },
          { createdAt: 'desc' }
        ],
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
              comments: true
            }
          }
        }
      })

      const recommendationsWithCounts = popularTracks.map(track => ({
        id: track.id,
        title: track.title,
        description: track.description,
        audioUrl: track.audioUrl,
        artworkUrl: track.artworkUrl,
        duration: track.duration,
        genre: track.genre,
        artist: track.artist,
        likeCount: track._count.likes,
        playCount: track.playCount,
        createdAt: track.createdAt
      }))

      return NextResponse.json({ recommendations: recommendationsWithCounts })
    }

    // Get the current track
    const currentTrack = await prisma.track.findUnique({
      where: { id: trackId },
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
            comments: true
          }
        }
      }
    })

    if (!currentTrack) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    // Strategy 1: Get tracks from the same genre
    let recommendations = []
    if (currentTrack.genre) {
      const genreTracks = await prisma.track.findMany({
        where: {
          genre: currentTrack.genre,
          id: { not: trackId },
          isPublic: true
        },
        take: 10,
        orderBy: [
          { playCount: 'desc' },
          { createdAt: 'desc' }
        ],
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
              comments: true
            }
          }
        }
      })
      recommendations.push(...genreTracks)
    }

    // Strategy 2: Get tracks from the same artist (if not enough genre tracks)
    if (recommendations.length < 5 && currentTrack.artistId) {
      const artistTracks = await prisma.track.findMany({
        where: {
          artistId: currentTrack.artistId,
          id: { not: trackId },
          isPublic: true
        },
        take: 5,
        orderBy: [
          { playCount: 'desc' },
          { createdAt: 'desc' }
        ],
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
              comments: true
            }
          }
        }
      })
      // Add artist tracks that aren't already in recommendations
      const existingIds = new Set(recommendations.map(t => t.id))
      artistTracks.forEach(track => {
        if (!existingIds.has(track.id)) {
          recommendations.push(track)
        }
      })
    }

    // Strategy 3: Get popular tracks (if still not enough)
    if (recommendations.length < 5) {
      const existingIds = new Set([trackId, ...recommendations.map(t => t.id)])
      const popularTracks = await prisma.track.findMany({
        where: {
          id: { notIn: Array.from(existingIds) },
          isPublic: true
        },
        take: 10,
        orderBy: [
          { playCount: 'desc' },
          { createdAt: 'desc' }
        ],
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
              comments: true
            }
          }
        }
      })
      recommendations.push(...popularTracks)
    }

    // Shuffle and limit to 5 recommendations
    const shuffled = recommendations.sort(() => Math.random() - 0.5).slice(0, 5)

    const recommendationsWithCounts = shuffled.map(track => ({
      id: track.id,
      title: track.title,
      description: track.description,
      audioUrl: track.audioUrl,
      artworkUrl: track.artworkUrl,
      duration: track.duration,
      genre: track.genre,
      artist: track.artist,
      likeCount: track._count.likes,
      playCount: track.playCount,
      createdAt: track.createdAt
    }))

    return NextResponse.json({ recommendations: recommendationsWithCounts })
  } catch (error) {
    console.error('Error fetching recommendations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

