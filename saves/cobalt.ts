import axios from 'axios'

const COBALT_API_URL = process.env.NEXT_PUBLIC_COBALT_API_URL || process.env.COBALT_API_URL || 'http://localhost:9000'

interface CobaltRequest {
  url: string
  audioFormat?: 'best' | 'mp3' | 'ogg' | 'wav' | 'opus'
  downloadMode?: 'auto' | 'audio' | 'mute'
  disableMetadata?: boolean
}

interface CobaltTunnelResponse {
  status: 'tunnel' | 'redirect'
  url: string
  filename: string
  author?: string
  artist?: string
  title?: string
  thumbnail?: string
  picture?: string
  artwork?: string
  cover?: string
  fileMetadata?: {
    title?: string
    artist?: string
    author?: string
    album?: string
    album_artist?: string
    genre?: string
    date?: string
  }
  [key: string]: any
}

interface CobaltErrorResponse {
  status: 'error'
  error: {
    code: string
    context?: any
  }
}

export type CobaltResponse = CobaltTunnelResponse | CobaltErrorResponse

/**
 * Process a SoundCloud URL and get streaming audio URL
 */
export async function processSoundCloudUrl(soundcloudUrl: string): Promise<CobaltResponse | null> {
  try {
    console.log('🎵 Processing SoundCloud URL:', soundcloudUrl)
    
    const response = await axios.post(`${COBALT_API_URL}/`, {
      url: soundcloudUrl,
      audioFormat: 'best',
      downloadMode: 'audio',
      disableMetadata: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    })
    
    console.log('✅ Cobalt response:', JSON.stringify(response.data, null, 2))
    
    return response.data
  } catch (error: any) {
    console.error('❌ Cobalt API error:', error)
    
    if (error.response?.data) {
      return error.response.data
    }
    
    return {
      status: 'error',
      error: {
        code: 'cobalt.fetch.fail'
      }
    }
  }
}

