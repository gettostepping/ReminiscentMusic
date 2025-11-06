import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const playlist = await prisma.playlist.findUnique({
      where: { id: params.id }
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    if (playlist.ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { trackId } = body

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 })
    }

    const track = await prisma.track.findUnique({
      where: { id: trackId }
    })

    if (!track) {
      return NextResponse.json({ error: 'Track not found' }, { status: 404 })
    }

    const existingEntry = await prisma.playlistTrack.findUnique({
      where: {
        playlistId_trackId: {
          playlistId: params.id,
          trackId
        }
      }
    })

    if (existingEntry) {
      return NextResponse.json({ error: 'Track already in playlist' }, { status: 400 })
    }

    const maxPosition = await prisma.playlistTrack.findFirst({
      where: { playlistId: params.id },
      orderBy: { position: 'desc' },
      select: { position: true }
    })

    const position = (maxPosition?.position ?? -1) + 1

    await prisma.playlistTrack.create({
      data: {
        playlistId: params.id,
        trackId,
        position
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding track to playlist:', error)
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

    const playlist = await prisma.playlist.findUnique({
      where: { id: params.id }
    })

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
    }

    if (playlist.ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const trackId = searchParams.get('trackId')

    if (!trackId) {
      return NextResponse.json({ error: 'Track ID is required' }, { status: 400 })
    }

    await prisma.playlistTrack.delete({
      where: {
        playlistId_trackId: {
          playlistId: params.id,
          trackId
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing track from playlist:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

