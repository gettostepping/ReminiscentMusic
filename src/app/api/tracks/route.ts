import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseBuffer } from 'music-metadata'
import { uploadToR2, generateFileKey } from '@/lib/r2'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const take = parseInt(searchParams.get('take') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')
    const artistId = searchParams.get('artistId')
    const search = searchParams.get('search')

    const where: any = {
      isPublic: true
    }

    if (artistId) {
      where.artistId = artistId
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { genre: { contains: search, mode: 'insensitive' } },
        { artist: { name: { contains: search, mode: 'insensitive' } } }
      ]
    }

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where,
        take,
        skip,
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
              comments: true
            }
          }
        }
      }),
      prisma.track.count({ where })
    ])

    const tracksWithCounts = tracks.map(track => ({
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

    return NextResponse.json({ tracks: tracksWithCounts, total })
  } catch (error) {
    console.error('Error fetching tracks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const formData = await req.formData()
    const title = formData.get('title') as string
    const description = formData.get('description') as string | null
    const genreRaw = formData.get('genre') as string | null
    const genre = genreRaw && genreRaw.trim() ? genreRaw.trim() : null
    const audioFile = formData.get('audio') as File | null
    const artworkFile = formData.get('artwork') as File | null

    if (!title || !audioFile) {
      return NextResponse.json({ error: 'Title and audio file are required' }, { status: 400 })
    }

    // Read audio file once for both upload and duration extraction
    const audioBytes = await audioFile.arrayBuffer()
    const audioBuffer = Buffer.from(audioBytes)

    // Extract duration from audio file (before upload)
    let duration: number | null = null
    try {
      const metadata = await parseBuffer(audioBuffer, { mimeType: audioFile.type || undefined })
      if (metadata.format.duration) {
        duration = Math.round(metadata.format.duration) // Round to nearest second
      }
    } catch (error) {
      console.error('Error extracting audio duration:', error)
      // Continue without duration if extraction fails
    }

    // Upload audio file to R2
    let audioUrl: string
    try {
      const audioKey = generateFileKey(user.id, audioFile.name, 'audio')
      audioUrl = await uploadToR2(audioBuffer, audioKey, audioFile.type || 'audio/mpeg')
    } catch (error: any) {
      console.error('Error uploading audio file to R2:', error)
      return NextResponse.json({ 
        error: 'Failed to upload audio file. Please try again or check your internet connection.' 
      }, { status: 500 })
    }

    // Upload artwork to R2 if provided
    let artworkUrl: string | null = null
    if (artworkFile) {
      try {
        const artworkBytes = await artworkFile.arrayBuffer()
        const artworkBuffer = Buffer.from(artworkBytes)
        const artworkKey = generateFileKey(user.id, artworkFile.name, 'artwork')
        artworkUrl = await uploadToR2(artworkBuffer, artworkKey, artworkFile.type || 'image/jpeg')
      } catch (error: any) {
        console.error('Error uploading artwork to R2:', error)
        // Continue without artwork if upload fails (non-critical)
        artworkUrl = null
      }
    }

    // Create track
    const track = await prisma.track.create({
      data: {
        title,
        description,
        genre,
        audioUrl,
        artworkUrl,
        duration,
        artistId: user.id,
        isPublic: true
      },
      include: {
        artist: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    return NextResponse.json({ track })
  } catch (error) {
    console.error('Error creating track:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

