import { NextRequest, NextResponse } from 'next/server'
import { fetchSoundCloudMetadata } from '@/lib/soundcloud-metadata'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json({ tracks: [] })
    }
    
    // Get SoundCloud client ID
    const scResponse = await fetch('https://soundcloud.com/').then(r => r.text()).catch(() => null)
    if (!scResponse) {
      return NextResponse.json({ tracks: [], error: 'Failed to fetch SoundCloud' })
    }
    
    const scripts = scResponse.matchAll(/<script.+src="(.+)">/g)
    let clientId: string | null = null
    
    for (const script of scripts) {
      const url = script[1]
      if (!url?.startsWith('https://a-v2.sndcdn.com/')) continue
      
      const scriptContent = await fetch(url).then(r => r.text()).catch(() => null)
      if (!scriptContent) continue
      
      const idMatch = scriptContent.match(/client_id=([A-Za-z0-9]{32})/)
      if (idMatch && idMatch[1]) {
        clientId = idMatch[1]
        break
      }
    }
    
    if (!clientId) {
      return NextResponse.json({ tracks: [], error: 'Failed to get SoundCloud client ID' })
    }
    
    // Search SoundCloud
    const searchUrl = new URL('https://api-v2.soundcloud.com/search/tracks')
    searchUrl.searchParams.set('q', query)
    searchUrl.searchParams.set('client_id', clientId)
    searchUrl.searchParams.set('limit', '20')
    
    const searchResponse = await fetch(searchUrl.toString()).then(r => r.json()).catch(() => null)
    
    if (!searchResponse || !Array.isArray(searchResponse.collection)) {
      return NextResponse.json({ tracks: [] })
    }
    
    // Map SoundCloud results to our format
    const tracks = searchResponse.collection.map((item: any) => {
      const track = item.track || item
      const artist = track.user?.full_name?.trim() || 
                     track.user?.fullName?.trim() || 
                     track.user?.display_name?.trim() ||
                     track.user?.username?.trim() || 
                     'Unknown Artist'
      
      let artworkUrl = null
      if (track.artwork_url) {
        artworkUrl = track.artwork_url.replace(/-large/, '-t500x500')
      } else if (track.user?.avatar_url) {
        artworkUrl = track.user.avatar_url.replace('-large.', '-t500x500.')
      }
      
      return {
        id: `soundcloud_${track.id}`,
        title: track.title || 'Untitled',
        artist: {
          name: artist,
          username: track.user?.username || null,
          permalink: track.user?.permalink || null,
          uid: null // SoundCloud users don't have UIDs in our system
        },
        artworkUrl: artworkUrl,
        duration: track.duration ? Math.floor(track.duration / 1000) : null,
        sourceUrl: track.permalink_url || track.uri,
        soundcloudId: track.id,
        isSoundCloud: true,
        likeCount: track.likes_count || 0,
        playCount: track.playback_count || 0,
        commentCount: track.comment_count || 0
      }
    })
    
    return NextResponse.json({ tracks })
    
  } catch (error: any) {
    console.error('SoundCloud search error:', error)
    return NextResponse.json({ tracks: [], error: error.message }, { status: 500 })
  }
}

