"use client"
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/useToast'

interface Track {
  id: string
  title: string
  description?: string | null
  audioUrl: string
  artworkUrl: string | null
  duration: number | null
  genre?: string | null
  artist: {
    id?: string
    uid?: string | number | null
    name: string | null
    image?: string | null
    username?: string | null
    permalink?: string | null
    soundcloudUrl?: string | null
  }
  likeCount?: number
  playCount?: number
  commentCount?: number
  isSoundCloud?: boolean
  sourceUrl?: string
  soundcloudId?: string
}

interface AudioPlayerContextType {
  tracks: Track[]
  contextTracks: Track[] // Tracks from the current section/context
  currentTrack: Track | null
  lastPlayedTrack: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  currentTrackIndex: number
  contextTrackIndex: number // Index in context tracks
  isLoading: boolean
  isLoop: boolean
  isShuffle: boolean
  setIsLoop: (value: boolean) => void
  setIsShuffle: (value: boolean) => void
  playTrack: (track: Track, index: number, contextTracks?: Track[]) => void
  togglePlayPause: () => void
  playNextTrack: () => void
  playPreviousTrack: () => void
  handleSeek: (time: number) => void
  handleVolumeChange: (volume: number) => void
  toggleMute: () => void
  loadTracks: () => Promise<void>
  refreshTracks: () => Promise<void>
  imageErrors: Set<string>
  handleImageError: (trackId: string) => void
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined)

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const { showSuccess, showError } = useToast()
  
  const [tracks, setTracks] = useState<Track[]>([])
  const [contextTracks, setContextTracks] = useState<Track[]>([]) // Tracks from current section
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTrackIndex, setCurrentTrackIndex] = useState(-1)
  const [contextTrackIndex, setContextTrackIndex] = useState(-1) // Index in context tracks
  const [isLoading, setIsLoading] = useState(false)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())
  const [isLoop, setIsLoop] = useState(false)
  const [isShuffle, setIsShuffle] = useState(false)
  const [lastPlayedTrack, setLastPlayedTrack] = useState<Track | null>(null)
  const isSeekingRef = useRef(false)
  
  const audioRef = useRef<HTMLAudioElement>(null)

  // Load last played track from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lastPlayedTrack')
      if (saved) {
        try {
          setLastPlayedTrack(JSON.parse(saved))
        } catch (error) {
          console.error('Failed to load last played track:', error)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedVolume = localStorage.getItem('audioVolume')
      if (savedVolume) {
        const vol = parseFloat(savedVolume)
        if (!isNaN(vol) && vol >= 0 && vol <= 1) {
          setVolume(vol)
        }
      }
    }
  }, [])

  // Setup audio element and event listeners - keep listeners always attached
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      if (!isSeekingRef.current && audio) {
        setCurrentTime(audio.currentTime)
      }
    }
    const updateDuration = () => {
      if (audio && audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
      }
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleLoadedMetadata = () => {
      if (audio && audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration)
      }
    }

    // Add event listeners
    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('durationchange', updateDuration)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)

    // Set volume
    audio.volume = isMuted ? 0 : volume

    return () => {
      // Cleanup event listeners
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('durationchange', updateDuration)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [volume, isMuted]) // Don't include currentTrack?.id - listeners should stay attached across track changes

  // Define callbacks first, before useEffects that use them
  const loadTracks = useCallback(async () => {
    if (!session?.user?.email) return
    
    setIsLoading(true)
    // Clear image errors when loading tracks to allow retrying images
    setImageErrors(new Set())
    try {
      const response = await fetch('/api/tracks?take=1000')
      const data = await response.json()
      if (data.tracks) {
        setTracks(data.tracks)
      }
    } catch (error) {
      console.error('Failed to load tracks:', error)
    } finally {
      setIsLoading(false)
    }
  }, [session?.user?.email])

  const refreshTracks = useCallback(async () => {
    await loadTracks()
  }, [loadTracks])

  const playTrack = useCallback(async (track: Track, index: number, contextTracksParam?: Track[]) => {
    const audio = audioRef.current
    if (!audio) return

    // If clicking the same track that's already playing, pause it
    if (currentTrack?.id === track.id && isPlaying) {
      audio.pause()
      return
    }

    // If clicking the same track that's paused, resume it
    if (currentTrack?.id === track.id && !isPlaying) {
      audio.play().catch(async (error) => {
        console.error('Failed to resume audio:', error)
        // If it's a SoundCloud track, try to refresh the URL
        if (track.isSoundCloud && track.sourceUrl) {
          try {
            const res = await fetch('/api/soundcloud/stream', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ soundcloudUrl: track.sourceUrl })
            })
            if (res.ok) {
              const data = await res.json()
              const refreshedTrack = data.track
              audio.src = refreshedTrack.audioUrl
              audio.load()
              await audio.play()
              // Update the track with new URL
              setCurrentTrack({ ...track, audioUrl: refreshedTrack.audioUrl })
              setLastPlayedTrack({ ...track, audioUrl: refreshedTrack.audioUrl })
            }
          } catch (refreshError) {
            console.error('Failed to refresh SoundCloud URL:', refreshError)
            showError('Failed to play audio. The track may be unavailable.')
          }
        } else {
          showError('Failed to play audio')
        }
      })
      return
    }

    // If it's a different track, switch to it
    isSeekingRef.current = false

    // For SoundCloud tracks, fetch streaming URL if missing or always refresh to ensure it's valid
    let finalTrack = track
    if (track.isSoundCloud && track.sourceUrl) {
      // Check if audioUrl is missing or empty (for imported tracks without Cobalt URL)
      const needsStreamingUrl = !track.audioUrl || track.audioUrl.trim() === ''
      
      if (needsStreamingUrl || true) { // Always refresh to ensure URL is valid
        try {
          const res = await fetch('/api/soundcloud/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ soundcloudUrl: track.sourceUrl })
          })
          if (res.ok) {
            const data = await res.json()
            finalTrack = { ...track, audioUrl: data.track.audioUrl }
          } else {
            const errorData = await res.json().catch(() => ({}))
            console.warn('Failed to fetch SoundCloud streaming URL:', res.status, errorData)
            if (needsStreamingUrl) {
              showError('Failed to load audio. Please try again.')
              return
            }
          }
        } catch (error) {
          console.error('Error fetching SoundCloud streaming URL:', error)
          if (needsStreamingUrl) {
            showError('Failed to load audio. Please try again.')
            return
          }
          // If we have a URL already, continue with it and retry on error
        }
      }
    }

    // Set context tracks if provided
    if (contextTracksParam && contextTracksParam.length > 0) {
      setContextTracks(contextTracksParam)
      const contextIndex = contextTracksParam.findIndex(t => t.id === track.id)
      setContextTrackIndex(contextIndex >= 0 ? contextIndex : -1)
    } else {
      // If no context tracks provided, use global tracks
      setContextTracks([])
      setContextTrackIndex(-1)
    }

    setCurrentTrack(finalTrack)
    setCurrentTrackIndex(index)
    
    // Save as last played track
    setLastPlayedTrack(finalTrack)
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastPlayedTrack', JSON.stringify(finalTrack))
    }
    
    if (finalTrack.duration) {
      setDuration(finalTrack.duration)
    } else {
      setDuration(0)
    }
    
    setCurrentTime(0)
    isSeekingRef.current = false // Reset seeking flag when loading new track
    
    // Add error handler to retry with fresh URL if playback fails
    const handleError = async () => {
      if (finalTrack.isSoundCloud && finalTrack.sourceUrl) {
        console.log('Audio load error, refreshing SoundCloud URL...')
        try {
          const res = await fetch('/api/soundcloud/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ soundcloudUrl: finalTrack.sourceUrl })
          })
          if (res.ok) {
            const data = await res.json()
            const refreshedTrack = { ...finalTrack, audioUrl: data.track.audioUrl }
            audio.src = refreshedTrack.audioUrl
            audio.load()
            setCurrentTrack(refreshedTrack)
            setLastPlayedTrack(refreshedTrack)
            await audio.play()
          } else {
            throw new Error('Failed to refresh URL')
          }
        } catch (error) {
          console.error('Failed to refresh SoundCloud URL:', error)
          showError('Failed to play audio. The track may be unavailable.')
        }
      } else {
        showError('Failed to play audio. The track may be unavailable.')
      }
    }
    
    audio.addEventListener('error', handleError, { once: true })
    
    audio.src = finalTrack.audioUrl
    audio.load()
    
    // If duration wasn't set from track metadata, wait for it to load from audio element
    if (!finalTrack.duration) {
      const updateDurationFromAudio = () => {
        if (audio && audio.duration && isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration)
          audio.removeEventListener('loadedmetadata', updateDurationFromAudio)
          audio.removeEventListener('durationchange', updateDurationFromAudio)
        }
      }
      audio.addEventListener('loadedmetadata', updateDurationFromAudio)
      audio.addEventListener('durationchange', updateDurationFromAudio)
    }
    
    // Record listening history when track starts playing
    if (session?.user?.email) {
      const recordHistory = () => {
        if (finalTrack.isSoundCloud) {
          fetch('/api/listening-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              trackId: finalTrack.soundcloudId || finalTrack.id,
              isSoundCloud: true,
              title: finalTrack.title,
              artist: finalTrack.artist?.name || null,
              artworkUrl: finalTrack.artworkUrl,
              audioUrl: finalTrack.audioUrl,
              sourceUrl: finalTrack.sourceUrl,
              duration: finalTrack.duration || null
            })
          }).catch(() => {}) // Silently fail if history recording fails
        } else {
          fetch('/api/listening-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trackId: finalTrack.id })
          }).catch(() => {}) // Silently fail if history recording fails
        }
      }
      
      audio.addEventListener('play', recordHistory, { once: true })
    }
    
    audio.play().then(() => {
      // Ensure seeking flag is reset after playback starts
      isSeekingRef.current = false
    }).catch(async (error) => {
      console.error('Failed to play audio:', error)
      isSeekingRef.current = false // Reset seeking flag on error
      // If it's a SoundCloud track and play failed, try refreshing URL
      if (finalTrack.isSoundCloud && finalTrack.sourceUrl) {
        await handleError()
      } else {
        showError('Failed to play audio. The track may be unavailable.')
      }
    })
  }, [currentTrack?.id, isPlaying, showError, session?.user?.email])

  // Now define the useEffect that uses playTrack
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    const handleEnded = async () => {
      isSeekingRef.current = false
      
      if (isLoop && currentTrack) {
        setTimeout(() => {
          if (audio && currentTrack) {
            audio.currentTime = 0
            setCurrentTime(0)
            audio.play().catch((error) => {
              console.error('Failed to loop track:', error)
              setIsPlaying(false)
              setCurrentTime(0)
            })
          }
        }, 50)
        return
      }
      
      setIsPlaying(false)
      
      // Check context tracks first (section tracks)
      if (contextTracks.length > 0 && contextTrackIndex >= 0) {
        if (isShuffle && contextTracks.length > 1) {
          const randomIndex = Math.floor(Math.random() * contextTracks.length)
          const randomTrack = contextTracks[randomIndex]
          const globalIndex = tracks.findIndex(t => t.id === randomTrack.id)
          playTrack(randomTrack, globalIndex >= 0 ? globalIndex : 0, contextTracks)
          return
        } else if (contextTrackIndex < contextTracks.length - 1) {
          // Next track in context
          const nextTrack = contextTracks[contextTrackIndex + 1]
          const globalIndex = tracks.findIndex(t => t.id === nextTrack.id)
          playTrack(nextTrack, globalIndex >= 0 ? globalIndex : 0, contextTracks)
          return
        }
      }
      
      // If no next track in context, try global tracks
      if (tracks.length > 0) {
        if (isShuffle && tracks.length > 1) {
          const randomIndex = Math.floor(Math.random() * tracks.length)
          const randomTrack = tracks[randomIndex]
          playTrack(randomTrack, randomIndex, [])
          return
        } else if (currentTrackIndex >= 0 && currentTrackIndex < tracks.length - 1) {
          const nextTrack = tracks[currentTrackIndex + 1]
          playTrack(nextTrack, currentTrackIndex + 1, [])
          return
        }
      }
      
      // No next track available, get recommendations
      if (currentTrack) {
        try {
          // Pass isSoundCloud flag if it's a SoundCloud track
          const isSoundCloud = currentTrack.isSoundCloud ? 'true' : 'false'
          const trackIdParam = currentTrack.isSoundCloud ? currentTrack.soundcloudId || currentTrack.id : currentTrack.id
          const res = await fetch(`/api/tracks/recommendations?trackId=${trackIdParam}&isSoundCloud=${isSoundCloud}`)
          if (res.ok) {
            const data = await res.json()
            if (data.recommendations && data.recommendations.length > 0) {
              // Try to find a track that hasn't been played yet
              let recommendedTrack = data.recommendations[0]
              
              // If we have context tracks, try to avoid recommending tracks already in context
              if (contextTracks.length > 0) {
                const contextIds = new Set(contextTracks.map(t => t.id))
                const newRec = data.recommendations.find((t: Track) => !contextIds.has(t.id))
                if (newRec) {
                  recommendedTrack = newRec
                }
              }
              
              const globalIndex = tracks.findIndex(t => t.id === recommendedTrack.id)
              // Create context with all recommendations for autoplay to continue
              playTrack(recommendedTrack, globalIndex >= 0 ? globalIndex : 0, data.recommendations)
              return
            }
          }
        } catch (error) {
          console.error('Failed to get recommendations:', error)
        }
      }
      
      // No recommendations available, stop playing
      setIsPlaying(false)
      setCurrentTrack(null)
    }

    audio.addEventListener('ended', handleEnded)
    return () => {
      audio.removeEventListener('ended', handleEnded)
    }
  }, [currentTrack?.id, currentTrackIndex, contextTrackIndex, contextTracks, isLoop, isShuffle, playTrack, tracks])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch((error) => {
        console.error('Failed to play audio:', error)
        showError('Failed to play audio')
      })
    }
  }

  const playNextTrack = useCallback(() => {
    // Check context tracks first
    if (contextTracks.length > 0 && contextTrackIndex >= 0) {
      if (isShuffle && contextTracks.length > 1) {
        const randomIndex = Math.floor(Math.random() * contextTracks.length)
        const randomTrack = contextTracks[randomIndex]
        const globalIndex = tracks.findIndex(t => t.id === randomTrack.id)
        playTrack(randomTrack, globalIndex >= 0 ? globalIndex : 0, contextTracks)
        return
      } else if (contextTrackIndex < contextTracks.length - 1) {
        const nextTrack = contextTracks[contextTrackIndex + 1]
        const globalIndex = tracks.findIndex(t => t.id === nextTrack.id)
        playTrack(nextTrack, globalIndex >= 0 ? globalIndex : 0, contextTracks)
        return
      }
    }
    
    // Fall back to global tracks
    setTracks(prevTracks => {
      if (prevTracks.length === 0) return prevTracks
      
      if (isShuffle && prevTracks.length > 1) {
        const randomIndex = Math.floor(Math.random() * prevTracks.length)
        const randomTrack = prevTracks[randomIndex]
        playTrack(randomTrack, randomIndex, [])
      } else if (currentTrackIndex >= 0 && currentTrackIndex < prevTracks.length - 1) {
        const nextTrack = prevTracks[currentTrackIndex + 1]
        playTrack(nextTrack, currentTrackIndex + 1, [])
      }
      return prevTracks
    })
  }, [currentTrackIndex, contextTrackIndex, contextTracks, isShuffle, playTrack, tracks])

  const playPreviousTrack = useCallback(() => {
    // Check context tracks first
    if (contextTracks.length > 0 && contextTrackIndex > 0) {
      const prevTrack = contextTracks[contextTrackIndex - 1]
      const globalIndex = tracks.findIndex(t => t.id === prevTrack.id)
      playTrack(prevTrack, globalIndex >= 0 ? globalIndex : 0, contextTracks)
      return
    }
    
    // Fall back to global tracks
    setTracks(prevTracks => {
      if (currentTrackIndex > 0) {
        const prevTrack = prevTracks[currentTrackIndex - 1]
        playTrack(prevTrack, currentTrackIndex - 1, [])
      }
      return prevTracks
    })
  }, [currentTrackIndex, contextTrackIndex, contextTracks, playTrack, tracks])

  const handleSeek = (time: number) => {
    const audio = audioRef.current
    if (!audio || !isFinite(time)) return
    
    const audioDuration = audio.duration
    const stateDuration = duration
    const validDuration = (audioDuration && isFinite(audioDuration) && audioDuration > 0) || 
                         (stateDuration && isFinite(stateDuration) && stateDuration > 0)
    
    if (!validDuration) {
      return
    }
    
    const maxDuration = audioDuration || stateDuration
    const clampedTime = Math.max(0, Math.min(time, maxDuration))
    
    isSeekingRef.current = true
    
    try {
      audio.currentTime = clampedTime
      setCurrentTime(clampedTime)
    } catch (error) {
      console.error('Failed to seek:', error)
      isSeekingRef.current = false
      return
    }
    
    setTimeout(() => {
      isSeekingRef.current = false
    }, 150)
  }

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
    localStorage.setItem('audioVolume', newVolume.toString())
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleImageError = (trackId: string) => {
    // Only add to errors if not already in the set
    // This prevents duplicate error handling
    setImageErrors(prev => {
      if (prev.has(trackId)) return prev
      return new Set(prev).add(trackId)
    })
  }

  const hasLoadedTracksRef = useRef(false)

  useEffect(() => {
    if (session?.user?.email && !hasLoadedTracksRef.current) {
      hasLoadedTracksRef.current = true
      loadTracks()
    } else if (!session?.user?.email) {
      // Reset when user logs out
      hasLoadedTracksRef.current = false
      setTracks([])
    }
  }, [session?.user?.email, loadTracks])

  const value: AudioPlayerContextType = {
    tracks,
    contextTracks,
    currentTrack,
    lastPlayedTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    currentTrackIndex,
    contextTrackIndex,
    isLoading,
    isLoop,
    isShuffle,
    setIsLoop,
    setIsShuffle,
    playTrack,
    togglePlayPause,
    playNextTrack,
    playPreviousTrack,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    loadTracks,
    refreshTracks,
    imageErrors,
    handleImageError
  }

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      <audio ref={audioRef} preload="metadata" style={{ display: 'none' }} />
    </AudioPlayerContext.Provider>
  )
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext)
  if (context === undefined) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider')
  }
  return context
}

