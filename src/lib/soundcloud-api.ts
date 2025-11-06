/**
 * SoundCloud API utilities
 */

interface SoundCloudUser {
  id: number
  username: string
  permalink: string
  full_name?: string
  display_name?: string
}

interface SoundCloudTrack {
  id: number
  title: string
  permalink: string
  permalink_url: string
  user: SoundCloudUser
  artwork_url?: string
  duration: number
  streamable: boolean
}

interface SoundCloudLikesResponse {
  collection: Array<{
    track?: SoundCloudTrack
    created_at: string
  }>
  next_href?: string
}

/**
 * Get SoundCloud client ID from the website
 * Uses the same reliable method as soundcloud-metadata.ts
 */
async function getSoundCloudClientId(): Promise<string | null> {
  try {
    // Fetch main page
    const scResponse = await fetch('https://soundcloud.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    }).then(r => r.text()).catch(() => null)
    
    if (!scResponse) {
      console.error('Failed to fetch SoundCloud homepage')
      return null
    }

    // Method 1: Check for version (this helps validate the page structure)
    const versionMatch = scResponse.match(/window\.__sc_version="([0-9]{10})"/)
    if (!versionMatch) {
      console.warn('SoundCloud page structure may have changed - no __sc_version found')
    }

    // Method 2: Extract from script tags (most reliable method)
    // Look for all script tags
    const scriptMatches = scResponse.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi)
    
    for (const match of scriptMatches) {
      const url = match[1]
      if (!url) continue
      
      // Focus on a-v2.sndcdn.com scripts (most reliable source)
      if (url.startsWith('https://a-v2.sndcdn.com/')) {
        try {
          console.log(`🔍 Checking script: ${url.substring(0, 60)}...`)
          const scriptContent = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': '*/*',
              'Referer': 'https://soundcloud.com/'
            }
          }).then(r => r.text()).catch((e) => {
            console.warn(`Failed to fetch script ${url}:`, e.message)
            return null
          })
          
          if (scriptContent) {
            // Try multiple patterns to find client_id
            const patterns = [
              /client_id=([A-Za-z0-9]{32})/,
              /client_id["\s:=]+([A-Za-z0-9]{32})/i,
              /"client_id":"([A-Za-z0-9]{32})"/,
              /'client_id':'([A-Za-z0-9]{32})'/,
              /clientId["\s:=]+([A-Za-z0-9]{32})/i,
              /CLIENT_ID["\s:=]+([A-Za-z0-9]{32})/
            ]
            
            for (const pattern of patterns) {
              const idMatch = scriptContent.match(pattern)
              if (idMatch && idMatch[1]) {
                const clientId = idMatch[1]
                console.log(`✅ Found SoundCloud client ID: ${clientId.substring(0, 8)}...`)
                return clientId
              }
            }
          }
        } catch (scriptError: any) {
          console.warn(`Error processing script ${url}:`, scriptError.message)
          continue
        }
      }
    }

    // Method 3: Try inline scripts in the HTML
    const inlineScriptMatches = scResponse.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)
    for (const match of inlineScriptMatches) {
      const scriptContent = match[1]
      if (!scriptContent || scriptContent.length > 50000) continue // Skip very large scripts
      
      const patterns = [
        /client_id=([A-Za-z0-9]{32})/,
        /client_id["\s:=]+([A-Za-z0-9]{32})/i,
        /"client_id":"([A-Za-z0-9]{32})"/
      ]
      
      for (const pattern of patterns) {
        const idMatch = scriptContent.match(pattern)
        if (idMatch && idMatch[1]) {
          const clientId = idMatch[1]
          console.log(`✅ Found SoundCloud client ID in inline script: ${clientId.substring(0, 8)}...`)
          return clientId
        }
      }
    }

    // Method 4: Try to find in window.__sc_hydration or similar objects
    const hydrationMatch = scResponse.match(/window\.__sc_hydration\s*=\s*({[\s\S]{0,100000}}?);/)
    if (hydrationMatch) {
      try {
        const hydration = JSON.parse(hydrationMatch[1])
        const findClientId = (obj: any): string | null => {
          if (typeof obj === 'string' && /^[A-Za-z0-9]{32}$/.test(obj)) {
            return obj
          }
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const found = findClientId(item)
              if (found) return found
            }
          } else if (obj && typeof obj === 'object') {
            if (obj.client_id || obj.clientId || obj.CLIENT_ID) {
              const id = obj.client_id || obj.clientId || obj.CLIENT_ID
              if (typeof id === 'string' && /^[A-Za-z0-9]{32}$/.test(id)) {
                return id
              }
            }
            for (const value of Object.values(obj)) {
              const found = findClientId(value)
              if (found) return found
            }
          }
          return null
        }
        const clientId = findClientId(hydration)
        if (clientId) {
          console.log(`✅ Found SoundCloud client ID in hydration: ${clientId.substring(0, 8)}...`)
          return clientId
        }
      } catch (e) {
        // JSON parse failed, continue
      }
    }

    console.error('❌ Could not find SoundCloud client ID in any script or inline data')
    return null
  } catch (error: any) {
    console.error('Failed to get SoundCloud client ID:', error.message)
    return null
  }
}


/**
 * Fetch user's LIKES from SoundCloud (not favorites)
 * Uses the /track_likes endpoint to get actual liked tracks
 */
export async function fetchSoundCloudUserFavorites(usernameOrUserId: string | number): Promise<SoundCloudTrack[]> {
  try {
    // If username provided, resolve to user ID and username first
    let userId: number
    let username: string
    if (typeof usernameOrUserId === 'string') {
      const user = await resolveSoundCloudUser(usernameOrUserId)
      if (!user) {
        throw new Error('Could not resolve SoundCloud user')
      }
      userId = user.id
      username = user.username
    } else {
      userId = usernameOrUserId
      username = '' // Not needed when using user ID
    }

    // Get client ID - this MUST work
    const clientId = await getSoundCloudClientId()
    if (!clientId) {
      throw new Error('Failed to get SoundCloud client ID. Please try again or check SoundCloud availability.')
    }

    const allTracks: SoundCloudTrack[] = []
    
    // Use the correct endpoint: /users/{userId}/likes/tracks (this is the actual likes endpoint)
    let nextUrl: string | null = `https://api-v2.soundcloud.com/users/${userId}/likes/tracks?client_id=${clientId}&limit=50&linked_partitioning=1`
    
    console.log(`🔍 Attempting to fetch LIKES from: ${nextUrl}`)

    while (nextUrl) {
      const response = await fetch(nextUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://soundcloud.com/',
          'Origin': 'https://soundcloud.com'
        }
      })
      
      if (!response.ok) {
        // If /likes/tracks fails, try /likes as fallback
        if (nextUrl.includes('/likes/tracks') && (response.status === 404 || response.status === 400)) {
          console.log('⚠️ /likes/tracks endpoint failed, trying /likes endpoint...')
          nextUrl = `https://api-v2.soundcloud.com/users/${userId}/likes?client_id=${clientId}&limit=50&linked_partitioning=1`
          continue
        }
        
        const errorText = await response.text().catch(() => '')
        console.error(`❌ API Error: ${response.status} - ${errorText.substring(0, 200)}`)
        if (response.status === 401 || response.status === 403) {
          throw new Error(`SoundCloud API authentication failed (${response.status}). User likes may be private or require authentication.`)
        } else if (response.status === 404) {
          throw new Error('User not found or has no public likes.')
        } else if (response.status === 500) {
          throw new Error('SoundCloud API server error. Please try again later.')
        }
        throw new Error(`SoundCloud API error: ${response.status} - ${errorText}`)
      }

      const data: any = await response.json()
      
      // Log what we got for debugging
      console.log(`📦 Received response, collection length: ${data.collection?.length || (Array.isArray(data) ? data.length : 0)}`)
      
      // Handle different response structures:
      // 1. { collection: [{ track: {...}, created_at: ... }], next_href: ... }
      // 2. { collection: [...track objects...], next_href: ... }
      // 3. Array of track objects directly
      let items: any[] = []
      if (Array.isArray(data)) {
        // Direct array of tracks
        items = data
      } else if (data.collection && Array.isArray(data.collection)) {
        items = data.collection
      } else {
        console.warn('⚠️ Unexpected response structure:', Object.keys(data))
        items = []
      }
      
      // Extract tracks from items
      const tracks = items
        .filter(item => {
          // Handle both structures: { track: {...} } and direct track objects
          const track = item.track || item
          if (!track) return false
          
          // Check if it's a track object
          const isTrack = track.kind === 'track' || 
                         (track.id && track.title && track.permalink)
          
          // Must be streamable
          const isStreamable = track.streamable !== false
          
          return isTrack && isStreamable
        })
        .map(item => {
          // Handle both structures - return the track object
          const track = item.track || item
          return track as SoundCloudTrack
        })
      
      console.log(`✅ Extracted ${tracks.length} streamable LIKED tracks`)
      allTracks.push(...tracks)

      // Check if there's more to fetch
      // Handle both response structures
      nextUrl = data.next_href ? `${data.next_href}&client_id=${clientId}` : null
      
      // If no next_href but we got fewer items than expected, check if there's more
      if (!nextUrl && tracks.length > 0 && tracks.length === 50) {
        // Might have more, but API doesn't provide next_href - this is a limitation
        console.log('⚠️ Received exactly 50 tracks, but no next_href - pagination may be incomplete')
      }

      // Add delay between pagination requests to avoid rate limiting
      if (nextUrl) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // SoundCloud returns likes in chronological order (oldest first)
    // Reverse to get newest first
    return allTracks.reverse()
  } catch (error) {
    console.error('Failed to fetch SoundCloud likes:', error)
    throw error
  }
}

/**
 * Resolve a SoundCloud URL to get user info
 */
export async function resolveSoundCloudUser(usernameOrUrl: string): Promise<SoundCloudUser | null> {
  try {
    // Extract username from URL if full URL provided
    let username = usernameOrUrl
    if (usernameOrUrl.includes('soundcloud.com/')) {
      const match = usernameOrUrl.match(/soundcloud\.com\/([^\/\?]+)/)
      if (match) {
        username = match[1]
      }
    }

    // Remove @ if present
    username = username.replace('@', '')

    // Try multiple methods to get client ID
    let clientId = await getSoundCloudClientId()
    
    // If client ID fetch failed, try alternative approach: scrape user page
    if (!clientId) {
      console.log('⚠️ Client ID fetch failed, trying alternative method...')
      // Try to get user info by scraping their profile page
      try {
        const profileUrl = `https://soundcloud.com/${username}`
        const profilePage = await fetch(profileUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }).then(r => r.text()).catch(() => null)
        
        if (profilePage) {
          // Try to extract user ID from the page
          const userIdMatch = profilePage.match(/"id":(\d+)/)
          const usernameMatch = profilePage.match(/"username":"([^"]+)"/)
          const permalinkMatch = profilePage.match(/"permalink":"([^"]+)"/)
          
          if (userIdMatch && usernameMatch) {
            return {
              id: parseInt(userIdMatch[1]),
              username: usernameMatch[1],
              permalink: permalinkMatch ? permalinkMatch[1] : usernameMatch[1],
              full_name: undefined,
              display_name: undefined
            }
          }
        }
      } catch (scrapeError) {
        console.error('Failed to scrape user page:', scrapeError)
      }
      
      throw new Error('Failed to get SoundCloud client ID and alternative method failed')
    }

    const resolveUrl = new URL('https://api-v2.soundcloud.com/resolve')
    resolveUrl.searchParams.set('url', `https://soundcloud.com/${username}`)
    resolveUrl.searchParams.set('client_id', clientId)

    const userData = await fetch(resolveUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }).then(r => r.json()).catch(() => null)
    
    if (!userData || userData.kind !== 'user') {
      return null
    }

    return {
      id: userData.id,
      username: userData.username,
      permalink: userData.permalink,
      full_name: userData.full_name,
      display_name: userData.display_name
    }
  } catch (error) {
    console.error('Failed to resolve SoundCloud user:', error)
    throw error
  }
}

