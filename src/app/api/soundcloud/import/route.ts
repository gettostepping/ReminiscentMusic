import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchSoundCloudUserFavorites, resolveSoundCloudUser } from '@/lib/soundcloud-api'
import { fetchSoundCloudMetadata } from '@/lib/soundcloud-metadata'

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
    const { username } = body

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'SoundCloud username or URL is required' }, { status: 400 })
    }

    // Resolve user to get their actual user ID and username
    const soundcloudUser = await resolveSoundCloudUser(username)
    if (!soundcloudUser) {
      return NextResponse.json({ error: 'Could not find SoundCloud user. Please check the username or URL.' }, { status: 404 })
    }

    // Fetch user's LIKES - pass the ID directly to avoid double resolution
    console.log(`🎵 Fetching LIKES for user: ${soundcloudUser.username} (ID: ${soundcloudUser.id})`)
    const favorites = await fetchSoundCloudUserFavorites(soundcloudUser.id)

    if (favorites.length === 0) {
      return NextResponse.json({ 
        success: true,
        imported: 0,
        skipped: 0,
        message: 'No favorites found for this user'
      })
    }

    console.log(`📥 Found ${favorites.length} LIKES, processing...`)

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        const sendProgress = (processed: number, imported: number, skipped: number, failed: number) => {
          const progress = JSON.stringify({
            type: 'progress',
            processed,
            total: favorites.length,
            imported,
            skipped,
            failed
          }) + '\n'
          controller.enqueue(encoder.encode(progress))
        }

    let imported = 0
    let skipped = 0 // Only for tracks already liked
    let failed = 0 // For tracks that failed to process
    const errors: string[] = []

    // Send initial progress
    sendProgress(0, 0, 0, 0)

    // Process each favorite
    for (let i = 0; i < favorites.length; i++) {
      const track = favorites[i]
      
      try {
        const trackUrl = track.permalink_url
        const soundcloudId = track.id.toString()

        // Check if already liked
        const existingLike = await prisma.trackLike.findUnique({
          where: {
            soundcloudTrackId_userId: {
              soundcloudTrackId: soundcloudId,
              userId: user.id
            }
          }
        })

        if (existingLike) {
          skipped++
          // Send progress update for skipped tracks too
          if ((i + 1) % 5 === 0 || i === favorites.length - 1) {
            sendProgress(i + 1, imported, skipped, failed)
          }
          continue
        }

        // Get metadata (with retry on failure)
        // Note: We skip Cobalt API calls during import to avoid rate limiting
        // Cobalt URLs will be fetched on-demand when the song is played
        let metadata = null
        try {
          metadata = await fetchSoundCloudMetadata(trackUrl)
        } catch (metaError) {
          console.warn(`⚠️ Failed to get metadata for ${trackUrl}, using track data from API`)
        }

        // Create like entry WITHOUT Cobalt URL (will be fetched on-demand when playing)
        await prisma.trackLike.create({
          data: {
            soundcloudTrackId: soundcloudId,
            userId: user.id,
            soundcloudTitle: metadata?.title || track.title,
            soundcloudArtist: metadata?.artist || track.user.full_name || track.user.display_name || track.user.username,
            soundcloudArtworkUrl: metadata?.artworkUrl || track.artwork_url || null,
            soundcloudAudioUrl: null, // Will be fetched on-demand via /api/soundcloud/stream when playing
            soundcloudSourceUrl: trackUrl,
            soundcloudDuration: metadata?.duration || track.duration ? Math.floor((track.duration || 0) / 1000) : null // Duration in seconds
          }
        })

        imported++

        // Add small delay to avoid overwhelming SoundCloud API (no Cobalt calls, so shorter delay)
        if (i < favorites.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      } catch (error: any) {
        console.error(`❌ Error importing track ${track.title}:`, error)
        errors.push(`Failed to import: ${track.title}`)
        failed++
        // Add delay before continuing
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      
      // Send progress update after processing each track (every 5 tracks or at the end)
      if ((i + 1) % 5 === 0 || i === favorites.length - 1) {
        sendProgress(i + 1, imported, skipped, failed)
      }
    }

        // Send final result
        const finalResult = JSON.stringify({
          type: 'complete',
          success: true,
          imported,
          skipped,
          failed,
          total: favorites.length,
          errors: errors.slice(0, 10), // Limit errors to first 10
          message: `Imported ${imported} tracks. Cobalt streaming URLs will be fetched automatically when you play each song.`
        }) + '\n'
        controller.enqueue(encoder.encode(finalResult))
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error: any) {
    console.error('❌ Import SoundCloud likes error:', error)
    
    // Provide more helpful error messages
    let errorMessage = 'Failed to import SoundCloud likes'
    if (error.message?.includes('500')) {
      errorMessage = 'SoundCloud API is currently unavailable or the user\'s likes are private. SoundCloud may require authentication to access user likes. Please try again later.'
    } else if (error.message?.includes('403')) {
      errorMessage = 'Access denied. The user\'s likes may be private or require authentication.'
    } else if (error.message?.includes('404')) {
      errorMessage = 'User not found. Please check the username or URL.'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: error.message
    }, { status: 500 })
  }
}

