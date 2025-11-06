import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const ownerId = searchParams.get('ownerId')
    const myPlaylists = searchParams.get('myPlaylists') === 'true'

    const session = await getServerSession(authOptions)
    let where: any = { isPublic: true }

    // If requesting my playlists, get all playlists (public and private) for current user
    if (myPlaylists && session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })
      if (user) {
        where = { ownerId: user.id }
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
    } else if (ownerId) {
      // If ownerId is provided, get public playlists for that user
      where = { ownerId, isPublic: true }
    }

    const playlists = await prisma.playlist.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
            uid: true
          }
        },
        _count: {
          select: {
            tracks: true
          }
        },
        tracks: {
          include: {
            track: {
              select: {
                duration: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      playlists: playlists.map(playlist => {
        const totalDuration = playlist.tracks.reduce((sum, pt) => {
          return sum + (pt.track.duration || 0)
        }, 0)
        
        // Remove tracks array from response to reduce payload size
        const { tracks, ...playlistWithoutTracks } = playlist
        
        return {
          ...playlistWithoutTracks,
          trackCount: playlist._count.tracks,
          totalDuration: totalDuration > 0 ? totalDuration : null
        }
      })
    })
  } catch (error) {
    console.error('Error fetching playlists:', error)
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

    const body = await req.json()
    const { name, description, isPublic, image } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const playlist = await prisma.playlist.create({
      data: {
        name,
        description,
        isPublic: isPublic !== false,
        image,
        ownerId: user.id
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true,
            uid: true
          }
        }
      }
    })

    return NextResponse.json({ playlist })
  } catch (error) {
    console.error('Error creating playlist:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

