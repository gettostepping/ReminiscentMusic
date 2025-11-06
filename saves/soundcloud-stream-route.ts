import { NextRequest, NextResponse } from 'next/server'
import { processSoundCloudUrl } from '@/lib/cobalt'
import { fetchSoundCloudMetadata } from '@/lib/soundcloud-metadata'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { soundcloudUrl } = body
    
    if (!soundcloudUrl || typeof soundcloudUrl !== 'string') {
      return NextResponse.json({ error: 'Valid SoundCloud URL required' }, { status: 400 })
    }
    
    // Validate it's a SoundCloud URL
    if (!soundcloudUrl.includes('soundcloud.com') && !soundcloudUrl.includes('on.soundcloud.com')) {
      return NextResponse.json({ error: 'Not a valid SoundCloud URL' }, { status: 400 })
    }
    
    // Fetch metadata first
    const metadata = await fetchSoundCloudMetadata(soundcloudUrl)
    
    // Process with Cobalt API to get streaming URL
    console.log('🎵 Processing SoundCloud URL with Cobalt...')
    const cobaltResponse = await processSoundCloudUrl(soundcloudUrl)
    
    if (!cobaltResponse || cobaltResponse.status === 'error') {
      return NextResponse.json({ 
        error: 'Failed to process SoundCloud URL',
        details: cobaltResponse?.error?.code || 'unknown_error'
      }, { status: 500 })
    }
    
    // Extract SoundCloud ID from URL
    const soundcloudIdMatch = soundcloudUrl.match(/soundcloud\.com\/[\w-]+\/([^\/\?]+)/)
    const soundcloudId = soundcloudIdMatch ? soundcloudIdMatch[1] : Date.now().toString()
    
    // Use metadata from SoundCloud API, fallback to URL parsing
    let finalArtist = metadata?.artist || null
    let finalTitle = metadata?.title || null
    let artworkUrl = metadata?.artworkUrl || null
    const duration = metadata?.duration || null
    const artistUsername = metadata?.artistUsername || null
    const artistPermalink = metadata?.artistPermalink || null
    
    // Fallback: Try to parse from URL if metadata not available
    if (!finalTitle || !finalArtist) {
      const urlParts = soundcloudUrl.match(/soundcloud\.com\/([^\/]+)\/([^\/\?]+)/)
      if (!finalTitle && urlParts) {
        finalTitle = urlParts[2].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }
      if (!finalArtist && urlParts) {
        finalArtist = urlParts[1].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }
    }
    
    // Return track data for streaming (not saved to database)
    return NextResponse.json({
      success: true,
      track: {
        id: `soundcloud_${soundcloudId}`,
        title: finalTitle || 'Unknown Track',
        artist: {
          name: finalArtist || 'Unknown Artist',
          username: artistUsername,
          permalink: artistPermalink,
          soundcloudUrl: artistPermalink ? `https://soundcloud.com/${artistPermalink}` : null
        },
        artworkUrl: artworkUrl,
        audioUrl: cobaltResponse.url, // Cobalt streaming URL
        duration: duration,
        sourceUrl: soundcloudUrl,
        soundcloudId: soundcloudId,
        isSoundCloud: true,
        likeCount: 0,
        playCount: 0,
        commentCount: 0
      }
    })
    
  } catch (error: any) {
    console.error('❌ Stream SoundCloud track error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

