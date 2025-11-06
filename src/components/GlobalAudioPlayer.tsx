"use client"
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faPlay,
  faPause,
  faStepBackward,
  faStepForward,
  faVolumeUp,
  faVolumeMute,
  faMusic,
  faChevronUp,
  faChevronDown,
  faShuffle,
  faRepeat,
  faHeart,
  faPlus
} from '@fortawesome/free-solid-svg-icons'
import { useAudioPlayer } from '@/contexts/AudioPlayerContext'
import { formatDuration } from '@/lib/timeUtils'
import { useSession } from 'next-auth/react'
import { useToast } from '@/hooks/useToast'

export default function GlobalAudioPlayer() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { showSuccess, showError } = useToast()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [position, setPosition] = useState({ x: 24, y: 24 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isLiked, setIsLiked] = useState(false)
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)
  const [playlists, setPlaylists] = useState<any[]>([])
  const playerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedPosition = localStorage.getItem('miniPlayerPosition')
    if (savedPosition) {
      try {
        const { x, y } = JSON.parse(savedPosition)
        const bottomY = window.innerHeight - y - (playerRef.current?.offsetHeight || 200)
        setPosition({ x, y: bottomY })
      } catch (error) {
        console.error('Failed to load saved position:', error)
      }
    } else {
      setPosition({ x: 24, y: window.innerHeight - 200 - 24 })
    }
  }, [])

  useEffect(() => {
    if (isCollapsed && position.x !== 0 && position.y !== 0) {
      const bottomY = window.innerHeight - position.y - (playerRef.current?.offsetHeight || 200)
      localStorage.setItem('miniPlayerPosition', JSON.stringify({ x: position.x, y: bottomY }))
    }
  }, [position, isCollapsed])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!playerRef.current || !isCollapsed) return
    if ((e.target as HTMLElement).closest('button, input, a')) {
      return
    }
    
    const rect = playerRef.current.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    setIsDragging(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !isCollapsed) return

      const newX = e.clientX - dragOffset.x
      const newY = e.clientY - dragOffset.y

      const maxX = window.innerWidth - (playerRef.current?.offsetWidth || 320)
      const maxY = window.innerHeight - (playerRef.current?.offsetHeight || 200)

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
    }
  }, [isDragging, dragOffset, isCollapsed])
  
  const {
    currentTrack,
    lastPlayedTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    currentTrackIndex,
    tracks,
    isLoop,
    isShuffle,
    setIsLoop,
    setIsShuffle,
    togglePlayPause,
    playNextTrack,
    playPreviousTrack,
    handleSeek,
    handleVolumeChange,
    toggleMute,
    playTrack
  } = useAudioPlayer()

  const displayTrack = currentTrack || lastPlayedTrack

  useEffect(() => {
    async function checkLikeStatus() {
      if (!displayTrack?.id || !session) {
        setIsLiked(false)
        return
      }

      try {
        if (displayTrack.isSoundCloud) {
          // Check SoundCloud track like status
          // Extract soundcloudId - try multiple ways
          const soundcloudId = displayTrack.soundcloudId || 
                              (displayTrack.id.toString().startsWith('soundcloud_') 
                                ? displayTrack.id.toString().replace('soundcloud_', '') 
                                : displayTrack.id.toString())
          
          const res = await fetch(`/api/soundcloud/like?trackId=${encodeURIComponent(soundcloudId)}`)
          if (res.ok) {
            const data = await res.json()
            setIsLiked(data.isLiked || false)
          } else {
            setIsLiked(false)
          }
        } else {
          // Fetch track details to get like status
          const res = await fetch(`/api/tracks/${displayTrack.id}`)
          if (res.ok) {
            const data = await res.json()
            setIsLiked(data.track.isLiked || false)
          } else {
            setIsLiked(false)
          }
        }
      } catch (error) {
        console.error('Failed to check like status:', error)
        setIsLiked(false)
      }
    }

    checkLikeStatus()
  }, [displayTrack?.id, displayTrack?.isSoundCloud, displayTrack?.soundcloudId, session])

  useEffect(() => {
    async function loadPlaylists() {
      if (!showPlaylistModal || !session) return

      try {
        const res = await fetch('/api/playlists')
        if (res.ok) {
          const data = await res.json()
          setPlaylists(data.playlists || [])
        }
      } catch (error) {
        console.error('Failed to load playlists:', error)
      }
    }

    loadPlaylists()
  }, [showPlaylistModal, session])

  const handleLike = async () => {
    if (!session) {
      showError('Please sign in to like tracks')
      return
    }

    if (!displayTrack?.id) return

    try {
      if (displayTrack.isSoundCloud) {
        // Handle SoundCloud track likes
        // Extract soundcloudId - try multiple ways
        const soundcloudId = displayTrack.soundcloudId || 
                            (displayTrack.id.toString().startsWith('soundcloud_') 
                              ? displayTrack.id.toString().replace('soundcloud_', '') 
                              : displayTrack.id.toString())
        
        const res = await fetch('/api/soundcloud/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trackId: soundcloudId,
            title: displayTrack.title,
            artist: displayTrack.artist?.name || null,
            artworkUrl: displayTrack.artworkUrl,
            audioUrl: displayTrack.audioUrl,
            sourceUrl: displayTrack.sourceUrl,
            duration: displayTrack.duration
          })
        })
        
        if (res.ok) {
          const data = await res.json()
          setIsLiked(data.liked)
          
          // Refresh like status to ensure it's accurate
          const checkRes = await fetch(`/api/soundcloud/like?trackId=${encodeURIComponent(soundcloudId)}`)
          if (checkRes.ok) {
            const checkData = await checkRes.json()
            setIsLiked(checkData.isLiked || false)
          }
        }
      } else {
        // Handle regular track likes
        const res = await fetch(`/api/tracks/${displayTrack.id}/like`, { method: 'POST' })
        if (res.ok) {
          const data = await res.json()
          setIsLiked(data.liked)
        }
      }
    } catch (error) {
      console.error('Failed to like track:', error)
      showError('Failed to like track')
    }
  }

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!displayTrack?.id) return

    try {
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: displayTrack.id })
      })

      if (res.ok) {
        showSuccess('Added to playlist')
        setShowPlaylistModal(false)
      } else {
        const errorData = await res.json()
        if (errorData.error === 'Track already in playlist') {
          showError('Track already in playlist')
        } else {
          showError('Failed to add to playlist')
        }
      }
    } catch (error) {
      console.error('Failed to add to playlist:', error)
      showError('Failed to add to playlist')
    }
  }
  
  if (pathname?.startsWith('/upload')) {
    return null
  }

  if (!displayTrack) {
    return null
  }

  return (
    <>
      {isCollapsed ? (
        <div 
          ref={playerRef}
          className="fixed w-80 depth-sidebar p-4 z-40 cursor-move select-none"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="grid grid-cols-[auto_1fr_auto] gap-1 mb-1.5 h-5">
            <div className="bg-neutral-800/50 rounded border border-neutral-700/50 h-full w-5 flex items-center justify-center p-0">
              <div className="w-4 h-4 bg-brand-600/20 rounded flex items-center justify-center">
                <span className="text-brand-400 text-[8px]">🎵</span>
              </div>
            </div>

            <div className="bg-neutral-800/50 rounded border border-neutral-700/50 h-full px-1 flex items-center justify-center">
              <span className="text-[7px] text-neutral-400 font-medium text-center"></span>
            </div>

            <div className="bg-neutral-800/50 rounded border border-neutral-700/50 h-full w-5 flex items-center justify-center p-0">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-4 h-4 rounded bg-neutral-700/90 hover:bg-neutral-600/90 border border-neutral-600/60 hover:border-brand-500/60 flex items-center justify-center transition-all duration-200 group"
                aria-label="Expand player"
              >
                <FontAwesomeIcon 
                  icon={faChevronUp} 
                  className="text-neutral-300 group-hover:text-brand-400 text-[5px] transition-all duration-200"
                />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-neutral-800 rounded-lg border border-neutral-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                {displayTrack.artworkUrl ? (
                  <img 
                    src={displayTrack.artworkUrl} 
                    alt={displayTrack.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/UnknownUser1024.png'
                    }}
                  />
                ) : (
                  <FontAwesomeIcon icon={faMusic} className="text-lg text-brand-400" />
                )}
              </div>

              <div className="flex-1 grid grid-cols-2 gap-1.5">
                <div className="bg-neutral-800/50 rounded-lg border border-neutral-700/50 p-1.5 text-center">
                  <div className="text-[10px] text-white truncate">
                    <span className="text-neutral-400">Song:</span> <span className="font-semibold">{displayTrack.title || 'Unknown Track'}</span>
                  </div>
                </div>

                <div className="bg-neutral-800/50 rounded-lg border border-neutral-700/50 p-1.5 text-center">
                  <div className="text-[10px] text-white truncate">
                    <span className="text-neutral-400">Artist:</span> <span>{displayTrack.artist?.name || 'Unknown Artist'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-neutral-800/50 rounded-lg border border-neutral-700/50 px-1.5 py-1">
              <div className="flex items-center gap-1.5 w-full">
                <div className="relative group/volume">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleMute()
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-0.5 rounded transition-colors flex-shrink-0 mini-player-btn cursor-pointer text-neutral-400 hover:text-brand-400"
                  >
                    <FontAwesomeIcon 
                      icon={isMuted ? faVolumeMute : faVolumeUp} 
                      className="text-[10px] mini-player-btn-icon" 
                    />
                  </button>
                  
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover/volume:opacity-100 pointer-events-none group-hover/volume:pointer-events-auto transition-opacity duration-200 z-50">
                    <div className="relative bg-neutral-900 border border-neutral-700 rounded-t-lg shadow-lg" style={{ height: '100px', width: '32px', padding: '8px 0' }}>
                      <div className="h-full flex items-center justify-center px-2">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={isMuted ? 0 : volume}
                          onChange={(e) => {
                            handleVolumeChange(parseFloat(e.target.value))
                            if (isMuted && parseFloat(e.target.value) > 0) {
                              toggleMute()
                            }
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="h-full w-1 bg-neutral-700 rounded-full appearance-none cursor-pointer accent-brand-600 slider-thumb-small"
                          style={{
                            transform: 'rotate(-90deg)',
                            transformOrigin: 'center',
                            width: '80px',
                            height: '4px'
                          }}
                        />
                      </div>
                      
                      <div 
                        className="absolute left-1/2 -translate-x-1/2 top-full"
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid #262626',
                          filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.5))'
                        }}
                      />
                      <div 
                        className="absolute left-1/2 -translate-x-1/2 top-full -mt-px"
                        style={{
                          width: 0,
                          height: 0,
                          borderLeft: '6px solid transparent',
                          borderRight: '6px solid transparent',
                          borderTop: '6px solid #404040'
                        }}
                      />
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsLoop(!isLoop)
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={`p-0.5 rounded transition-colors flex-shrink-0 mini-player-btn cursor-pointer ${
                    isLoop 
                      ? 'bg-brand-600/30 text-brand-400' 
                      : 'text-neutral-400 hover:text-brand-400'
                  }`}
                >
                  <FontAwesomeIcon icon={faRepeat} className="text-[10px] mini-player-btn-icon" />
                </button>

                <div className="flex-1 flex items-center gap-1 min-w-0" onMouseDown={(e) => e.stopPropagation()}>
                  <span className="text-[8px] text-neutral-400 w-8 text-right flex-shrink-0">{formatDuration(currentTime)}</span>
                  <input
                    type="range"
                    min="0"
                    max={duration > 0 ? duration : 1}
                    value={duration > 0 ? currentTime : 0}
                    step="0.1"
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="flex-1 h-0.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-brand-600 min-w-0 slider-thumb-small"
                  />
                  <span className="text-[8px] text-neutral-400 w-8 flex-shrink-0">{formatDuration(duration)}</span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      playPreviousTrack()
                    }}
                    disabled={currentTrackIndex <= 0}
                    className="text-neutral-400 hover:text-brand-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed p-0.5 mini-player-btn disabled:transform-none cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faStepBackward} className="text-[10px] mini-player-btn-icon" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!currentTrack && lastPlayedTrack) {
                        const trackIndex = tracks.findIndex(t => t.id === lastPlayedTrack.id)
                        playTrack(lastPlayedTrack, trackIndex >= 0 ? trackIndex : 0)
                      } else {
                        togglePlayPause()
                      }
                    }}
                    className="w-5 h-5 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center transition-colors flex-shrink-0 mini-player-play-btn cursor-pointer"
                    style={{
                      boxShadow: '0 0 8px rgba(124, 58, 237, 0.6)'
                    }}
                  >
                    <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} className="text-[6px] ml-0.5" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      playNextTrack()
                    }}
                    disabled={currentTrackIndex >= tracks.length - 1}
                    className="text-neutral-400 hover:text-brand-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed p-0.5 mini-player-btn disabled:transform-none cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faStepForward} className="text-[10px] mini-player-btn-icon" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-sm border-t border-neutral-800/60 z-40" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.3), 0 -2px 4px -1px rgba(0, 0, 0, 0.2), 0 -8px 16px -4px rgba(0, 0, 0, 0.4)' }}>
          <div className="max-w-7xl mx-auto px-6 py-4 relative">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="absolute top-2 right-2 w-7 h-7 rounded-md bg-neutral-800/90 hover:bg-neutral-700/90 border border-neutral-700/60 hover:border-brand-500/60 flex items-center justify-center transition-all duration-200 group backdrop-blur-sm"
            >
              <FontAwesomeIcon 
                icon={faChevronDown} 
                className="text-neutral-300 group-hover:text-brand-400 text-[10px] transition-all duration-200 group-hover:scale-125"
              />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-4 flex-shrink-0 min-w-0">
                {displayTrack.artworkUrl ? (
                  <img 
                    src={displayTrack.artworkUrl} 
                    alt={displayTrack.title}
                    className="w-16 h-16 rounded-lg object-cover"
                    style={{
                      boxShadow: '0 0 15px rgba(124, 58, 237, 0.6), 0 0 30px rgba(124, 58, 237, 0.4)'
                    }}
                    onError={(e) => {
                      e.currentTarget.src = '/UnknownUser1024.png'
                    }}
                  />
                ) : (
                  <div 
                    className="w-16 h-16 rounded-lg bg-gradient-to-br from-brand-600/20 to-purple-600/20 flex items-center justify-center"
                    style={{
                      boxShadow: '0 0 15px rgba(124, 58, 237, 0.6), 0 0 30px rgba(124, 58, 237, 0.4)'
                    }}
                  >
                    <FontAwesomeIcon icon={faMusic} className="text-2xl text-brand-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{displayTrack.title || 'Unknown Track'}</p>
                  <p className="text-neutral-400 text-sm truncate">{displayTrack.artist?.name || 'Unknown Artist'}</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsShuffle(!isShuffle)}
                    className={`transition-colors ${isShuffle ? 'text-brand-400' : 'text-neutral-400 hover:text-white'}`}
                  >
                    <FontAwesomeIcon icon={faShuffle} />
                  </button>
                  <button
                    onClick={playPreviousTrack}
                    disabled={currentTrackIndex <= 0}
                    className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FontAwesomeIcon icon={faStepBackward} />
                  </button>

                  <button
                    onClick={() => {
                      if (!currentTrack && lastPlayedTrack) {
                        const trackIndex = tracks.findIndex(t => t.id === lastPlayedTrack.id)
                        playTrack(lastPlayedTrack, trackIndex >= 0 ? trackIndex : 0)
                      } else {
                        togglePlayPause()
                      }
                    }}
                    className="w-12 h-12 rounded-full bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center transition-colors"
                  >
                    <FontAwesomeIcon icon={isPlaying ? faPause : faPlay} className={isPlaying ? '' : 'ml-1'} />
                  </button>

                  <button
                    onClick={playNextTrack}
                    disabled={currentTrackIndex >= tracks.length - 1}
                    className="text-neutral-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FontAwesomeIcon icon={faStepForward} />
                  </button>
                  <button
                    onClick={() => setIsLoop(!isLoop)}
                    className={`transition-colors ${isLoop ? 'text-brand-400' : 'text-neutral-400 hover:text-white'}`}
                  >
                    <FontAwesomeIcon icon={faRepeat} />
                  </button>
                </div>

                <div className="w-full flex items-center gap-2">
                  <span className="text-xs text-neutral-400 w-10 text-right">{formatDuration(currentTime)}</span>
                  <input
                    type="range"
                    min="0"
                    max={duration > 0 ? duration : 1}
                    value={duration > 0 ? currentTime : 0}
                    step="0.1"
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-brand-600 slider-thumb-small"
                  />
                  <span className="text-xs text-neutral-400 w-10">{formatDuration(duration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleLike}
                  className={`transition-colors w-8 ${
                    isLiked 
                      ? 'text-red-500 hover:text-red-400' 
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title={isLiked ? 'Unlike' : 'Like'}
                >
                  <FontAwesomeIcon icon={faHeart} />
                </button>
                <button
                  onClick={() => setShowPlaylistModal(true)}
                  className="text-neutral-400 hover:text-white transition-colors w-8"
                  title="Add to playlist"
                >
                  <FontAwesomeIcon icon={faPlus} />
                </button>
                <button
                  onClick={toggleMute}
                  className="text-neutral-400 hover:text-white transition-colors w-8"
                >
                  <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} />
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showPlaylistModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowPlaylistModal(false)}
        >
          <div 
            className="depth-section p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-4">Add to Playlist</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {playlists.length === 0 ? (
                <p className="text-neutral-400">No playlists yet. Create one first!</p>
              ) : (
                playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleAddToPlaylist(playlist.id)}
                    className="w-full text-left px-4 py-3 bg-neutral-700 hover:bg-neutral-600 rounded-lg transition-colors"
                  >
                    <p className="text-white font-medium">{playlist.name}</p>
                    <p className="text-neutral-400 text-sm">{playlist.trackCount || 0} tracks</p>
                  </button>
                ))
              )}
            </div>
            <button
              onClick={() => setShowPlaylistModal(false)}
              className="mt-4 w-full px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  )
}
