/**
 * Fetch metadata directly from SoundCloud's API
 */
export async function fetchSoundCloudMetadata(soundcloudUrl: string) {
  try {
    // Extract artist and track from URL
    const urlMatch = soundcloudUrl.match(/soundcloud\.com\/([^\/]+)\/([^\/\?]+)/)
    if (!urlMatch) return null
    
    const [, artistSlug, trackSlug] = urlMatch
    
    // Get SoundCloud client ID
    const scResponse = await fetch('https://soundcloud.com/').then(r => r.text()).catch(() => null)
    if (!scResponse) return null
    
    const versionMatch = scResponse.match(/window\.__sc_version="([0-9]{10})"/)
    if (!versionMatch) return null
    
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
    
    if (!clientId) return null
    
    // Resolve the track using SoundCloud API
    const resolveUrl = new URL('https://api-v2.soundcloud.com/resolve')
    resolveUrl.searchParams.set('url', soundcloudUrl)
    resolveUrl.searchParams.set('client_id', clientId)
    
    const trackData = await fetch(resolveUrl.toString()).then(r => r.json()).catch(() => null)
    if (!trackData) return null
    
    // Extract metadata
    const artist = trackData.user?.full_name?.trim() || 
                   trackData.user?.fullName?.trim() || 
                   trackData.user?.display_name?.trim() ||
                   trackData.user?.username?.trim() || 
                   null
    
    // Extract duration (SoundCloud returns duration in milliseconds)
    const durationMs = trackData.duration || null
    const durationSeconds = durationMs ? Math.floor(durationMs / 1000) : null
    
    const metadata = {
      title: trackData.title?.trim() || null,
      artist: artist,
      artistUsername: trackData.user?.username || null,
      artistPermalink: trackData.user?.permalink || null,
      artworkUrl: null as string | null,
      duration: durationSeconds
    }
    
    // Get artwork URL - try high-res version first
    if (trackData.artwork_url) {
      const highResUrl = trackData.artwork_url.replace(/-large/, '-t1080x1080')
      // Test if high-res exists
      const testRes = await fetch(highResUrl).then(r => r.status === 200).catch(() => false)
      metadata.artworkUrl = testRes ? highResUrl : trackData.artwork_url
    }
    
    // Also try user avatar as fallback if no artwork
    if (!metadata.artworkUrl && trackData.user?.avatar_url) {
      metadata.artworkUrl = trackData.user.avatar_url.replace('-large.', '-t500x500.')
    }
    
    return metadata
  } catch (error) {
    console.error('❌ Failed to fetch SoundCloud metadata:', error)
    return null
  }
}

