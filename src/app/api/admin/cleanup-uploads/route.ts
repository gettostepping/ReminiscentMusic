import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Cleanup API endpoint to remove tracks with /uploads/ paths from the database
 * This should be run after migrating files to R2
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        roles: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check admin status
    const roleNames = user.roles.map(r => r.name)
    const isAdmin = roleNames.includes('admin') || 
                    roleNames.includes('owner') || 
                    roleNames.includes('developer')

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Find all tracks with /uploads/ paths
    const tracksWithLocalPaths = await prisma.track.findMany({
      where: {
        OR: [
          { audioUrl: { startsWith: '/uploads/' } },
          { artworkUrl: { startsWith: '/uploads/' } }
        ]
      },
      select: {
        id: true,
        title: true,
        audioUrl: true,
        artworkUrl: true
      }
    })

    if (tracksWithLocalPaths.length === 0) {
      return NextResponse.json({ 
        message: 'No tracks with local upload paths found',
        deleted: 0
      })
    }

    // Delete all tracks with local paths
    const deleteResult = await prisma.track.deleteMany({
      where: {
        OR: [
          { audioUrl: { startsWith: '/uploads/' } },
          { artworkUrl: { startsWith: '/uploads/' } }
        ]
      }
    })

    return NextResponse.json({
      message: `Successfully deleted ${deleteResult.count} track(s) with local upload paths`,
      deleted: deleteResult.count,
      tracks: tracksWithLocalPaths.map(t => ({
        id: t.id,
        title: t.title,
        audioUrl: t.audioUrl,
        artworkUrl: t.artworkUrl
      }))
    })
  } catch (error) {
    console.error('Error cleaning up uploads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET endpoint to preview tracks that would be deleted
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        roles: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check admin status
    const roleNames = user.roles.map(r => r.name)
    const isAdmin = roleNames.includes('admin') || 
                    roleNames.includes('owner') || 
                    roleNames.includes('developer')

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    // Find all tracks with /uploads/ paths (preview only)
    const tracksWithLocalPaths = await prisma.track.findMany({
      where: {
        OR: [
          { audioUrl: { startsWith: '/uploads/' } },
          { artworkUrl: { startsWith: '/uploads/' } }
        ]
      },
      select: {
        id: true,
        title: true,
        audioUrl: true,
        artworkUrl: true,
        createdAt: true,
        artist: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      count: tracksWithLocalPaths.length,
      tracks: tracksWithLocalPaths
    })
  } catch (error) {
    console.error('Error previewing uploads cleanup:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

