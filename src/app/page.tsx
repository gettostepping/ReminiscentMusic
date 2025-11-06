"use client"
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlay, faPause, faMusic, faHeart, faComment, faChevronRight, faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import NotSignedIn from '@/components/NotSignedIn'
import { useAudioPlayer } from '@/contexts/AudioPlayerContext'
import { formatDuration, formatRelativeTime } from '@/lib/timeUtils'
import { getUserAvatar } from '@/lib/images'
import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { tracks, playTrack, currentTrack, isPlaying } = useAudioPlayer()
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([])
  const [playlists, setPlaylists] = useState<any[]>([])
  const [likedTracks, setLikedTracks] = useState<any[]>([])
  const [totalLikes, setTotalLikes] = useState(0)
  const [listeningHistory, setListeningHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [recentlyPlayedScroll, setRecentlyPlayedScroll] = useState(0)
  const [playlistsScroll, setPlaylistsScroll] = useState(0)
  const [mostRecentTracks, setMostRecentTracks] = useState<any[]>([])
  const [mostRecentTracksScroll, setMostRecentTracksScroll] = useState(0)
  const [showRecentlyPlayedRightArrow, setShowRecentlyPlayedRightArrow] = useState(false)
  const [showPlaylistsRightArrow, setShowPlaylistsRightArrow] = useState(false)
  const [showMostRecentTracksRightArrow, setShowMostRecentTracksRightArrow] = useState(false)
  const hasLoadedRef = useRef(false)
  const recentlyPlayedRef = useRef<HTMLDivElement>(null)
  const playlistsRef = useRef<HTMLDivElement>(null)
  const mostRecentTracksRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true
    
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    
    async function loadData() {
      try {
        // Load listening history (includes recently played)
        const historyRes = await fetch('/api/listening-history?limit=50')
        if (historyRes.ok) {
          const historyData = await historyRes.json()
          if (mounted) {
            setRecentlyPlayed(historyData.recentlyPlayed || [])
            setListeningHistory((historyData.history || []).slice(0, 3))
          }
        }

        // Load playlists
        const playlistsRes = await fetch('/api/playlists?myPlaylists=true')
        if (playlistsRes.ok) {
          const playlistsData = await playlistsRes.json()
          if (mounted) {
            setPlaylists(playlistsData.playlists || [])
          }
        }

        // Load liked tracks
        const likesRes = await fetch('/api/likes?limit=10')
        if (likesRes.ok) {
          const likesData = await likesRes.json()
          if (mounted) {
            setLikedTracks((likesData.likes || []).slice(0, 3))
            setTotalLikes(likesData.total || 0)
          }
        }

        // Load most recent tracks
        const tracksRes = await fetch('/api/tracks?take=20')
        if (tracksRes.ok) {
          const tracksData = await tracksRes.json()
          if (mounted) {
            setMostRecentTracks(tracksData.tracks || [])
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    loadData()
    
    return () => {
      mounted = false
    }
  }, [])

  const scrollRecentlyPlayed = useCallback((direction: 'left' | 'right') => {
    if (!recentlyPlayedRef.current) return
    const cardWidth = 192 + 24 // w-48 (192px) + gap (24px)
    const scrollAmount = cardWidth * 4 // Scroll 4 cards at a time
    const el = recentlyPlayedRef.current
    const currentScroll = el.scrollLeft
    const maxScroll = el.scrollWidth - el.clientWidth
    const newScroll = direction === 'right' 
      ? Math.min(currentScroll + scrollAmount, maxScroll)
      : Math.max(currentScroll - scrollAmount, 0)
    
    el.scrollTo({ left: newScroll, behavior: 'smooth' })
    
    // Update arrow visibility after scroll
    setTimeout(() => {
      const scrollLeft = el.scrollLeft
      const max = el.scrollWidth - el.clientWidth
      const hasScroll = el.scrollWidth > el.clientWidth
      const canScrollRight = scrollLeft < max - 5
      setShowRecentlyPlayedRightArrow(hasScroll && canScrollRight)
      setRecentlyPlayedScroll(scrollLeft)
    }, 100)
  }, [])

  const scrollPlaylists = useCallback((direction: 'left' | 'right') => {
    if (!playlistsRef.current) return
    const cardWidth = 192 + 24 // w-48 (192px) + gap (24px)
    const scrollAmount = cardWidth * 4 // Scroll 4 cards at a time
    const el = playlistsRef.current
    const currentScroll = el.scrollLeft
    const maxScroll = el.scrollWidth - el.clientWidth
    const newScroll = direction === 'right' 
      ? Math.min(currentScroll + scrollAmount, maxScroll)
      : Math.max(currentScroll - scrollAmount, 0)
    
    el.scrollTo({ left: newScroll, behavior: 'smooth' })
    
    // Update arrow visibility after scroll
    setTimeout(() => {
      const scrollLeft = el.scrollLeft
      const max = el.scrollWidth - el.clientWidth
      const hasScroll = el.scrollWidth > el.clientWidth
      const canScrollRight = scrollLeft < max - 5
      setShowPlaylistsRightArrow(hasScroll && canScrollRight)
      setPlaylistsScroll(scrollLeft)
    }, 100)
  }, [])

  const scrollMostRecentTracks = useCallback((direction: 'left' | 'right') => {
    if (!mostRecentTracksRef.current) return
    const cardWidth = 192 + 24 // w-48 (192px) + gap (24px)
    const scrollAmount = cardWidth * 4 // Scroll 4 cards at a time
    const el = mostRecentTracksRef.current
    const currentScroll = el.scrollLeft
    const maxScroll = el.scrollWidth - el.clientWidth
    const newScroll = direction === 'right' 
      ? Math.min(currentScroll + scrollAmount, maxScroll)
      : Math.max(currentScroll - scrollAmount, 0)
    
    el.scrollTo({ left: newScroll, behavior: 'smooth' })
    
    // Update arrow visibility after scroll
    setTimeout(() => {
      const scrollLeft = el.scrollLeft
      const max = el.scrollWidth - el.clientWidth
      const hasScroll = el.scrollWidth > el.clientWidth
      const canScrollRight = scrollLeft < max - 5
      setShowMostRecentTracksRightArrow(hasScroll && canScrollRight)
      setMostRecentTracksScroll(scrollLeft)
    }, 100)
  }, [])

  // Check if arrows should be visible
  useEffect(() => {
    if (!loading && recentlyPlayed.length > 0) {
      const checkRecentlyPlayedArrows = () => {
        if (recentlyPlayedRef.current) {
          const el = recentlyPlayedRef.current
          const hasScroll = el.scrollWidth > el.clientWidth
          const scrollLeft = el.scrollLeft
          const maxScroll = el.scrollWidth - el.clientWidth
          const canScrollRight = scrollLeft < maxScroll - 5 // 5px threshold
          const canScrollLeft = scrollLeft > 5 // 5px threshold
          setShowRecentlyPlayedRightArrow(hasScroll && canScrollRight)
          setRecentlyPlayedScroll(scrollLeft)
        }
      }
      
      // Check with multiple timeouts to ensure DOM is ready
      setTimeout(checkRecentlyPlayedArrows, 100)
      setTimeout(checkRecentlyPlayedArrows, 300)
      setTimeout(checkRecentlyPlayedArrows, 500)
    }
  }, [loading, recentlyPlayed.length])

  useEffect(() => {
    if (!loading && playlists.length > 0) {
      const checkPlaylistsArrows = () => {
        if (playlistsRef.current) {
          const el = playlistsRef.current
          const hasScroll = el.scrollWidth > el.clientWidth
          const scrollLeft = el.scrollLeft
          const maxScroll = el.scrollWidth - el.clientWidth
          const canScrollRight = scrollLeft < maxScroll - 5 // 5px threshold
          const canScrollLeft = scrollLeft > 5 // 5px threshold
          setShowPlaylistsRightArrow(hasScroll && canScrollRight)
          setPlaylistsScroll(scrollLeft)
        }
      }
      
      // Check with multiple timeouts to ensure DOM is ready
      setTimeout(checkPlaylistsArrows, 100)
      setTimeout(checkPlaylistsArrows, 300)
      setTimeout(checkPlaylistsArrows, 500)
    }
  }, [loading, playlists.length])

  useEffect(() => {
    if (!loading && mostRecentTracks.length > 0) {
      const checkMostRecentTracksArrows = () => {
        if (mostRecentTracksRef.current) {
          const el = mostRecentTracksRef.current
          const hasScroll = el.scrollWidth > el.clientWidth
          const scrollLeft = el.scrollLeft
          const maxScroll = el.scrollWidth - el.clientWidth
          const canScrollRight = scrollLeft < maxScroll - 5 // 5px threshold
          const canScrollLeft = scrollLeft > 5 // 5px threshold
          setShowMostRecentTracksRightArrow(hasScroll && canScrollRight)
          setMostRecentTracksScroll(scrollLeft)
        }
      }
      
      // Check with multiple timeouts to ensure DOM is ready
      setTimeout(checkMostRecentTracksArrows, 100)
      setTimeout(checkMostRecentTracksArrows, 300)
      setTimeout(checkMostRecentTracksArrows, 500)
    }
  }, [loading, mostRecentTracks.length])

  // Check on window resize
  useEffect(() => {
    const handleResize = () => {
      if (recentlyPlayedRef.current) {
        const el = recentlyPlayedRef.current
        const hasScroll = el.scrollWidth > el.clientWidth
        const scrollLeft = el.scrollLeft
        const maxScroll = el.scrollWidth - el.clientWidth
        const canScrollRight = scrollLeft < maxScroll - 5
        setShowRecentlyPlayedRightArrow(hasScroll && canScrollRight)
      }
      if (playlistsRef.current) {
        const el = playlistsRef.current
        const hasScroll = el.scrollWidth > el.clientWidth
        const scrollLeft = el.scrollLeft
        const maxScroll = el.scrollWidth - el.clientWidth
        const canScrollRight = scrollLeft < maxScroll - 5
        setShowPlaylistsRightArrow(hasScroll && canScrollRight)
      }
      if (mostRecentTracksRef.current) {
        const el = mostRecentTracksRef.current
        const hasScroll = el.scrollWidth > el.clientWidth
        const scrollLeft = el.scrollLeft
        const maxScroll = el.scrollWidth - el.clientWidth
        const canScrollRight = scrollLeft < maxScroll - 5
        setShowMostRecentTracksRightArrow(hasScroll && canScrollRight)
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Update scroll position on scroll
  useEffect(() => {
    const handleRecentlyPlayedScroll = () => {
      if (recentlyPlayedRef.current) {
        const el = recentlyPlayedRef.current
        const scrollLeft = el.scrollLeft
        const maxScroll = el.scrollWidth - el.clientWidth
        const hasScroll = el.scrollWidth > el.clientWidth
        const canScrollRight = scrollLeft < maxScroll - 5 // 5px threshold
        
        setRecentlyPlayedScroll(scrollLeft)
        setShowRecentlyPlayedRightArrow(hasScroll && canScrollRight)
      }
    }
    const handlePlaylistsScroll = () => {
      if (playlistsRef.current) {
        const el = playlistsRef.current
        const scrollLeft = el.scrollLeft
        const maxScroll = el.scrollWidth - el.clientWidth
        const hasScroll = el.scrollWidth > el.clientWidth
        const canScrollRight = scrollLeft < maxScroll - 5 // 5px threshold
        
        setPlaylistsScroll(scrollLeft)
        setShowPlaylistsRightArrow(hasScroll && canScrollRight)
      }
    }
    const handleMostRecentTracksScroll = () => {
      if (mostRecentTracksRef.current) {
        const el = mostRecentTracksRef.current
        const scrollLeft = el.scrollLeft
        const maxScroll = el.scrollWidth - el.clientWidth
        const hasScroll = el.scrollWidth > el.clientWidth
        const canScrollRight = scrollLeft < maxScroll - 5 // 5px threshold
        
        setMostRecentTracksScroll(scrollLeft)
        setShowMostRecentTracksRightArrow(hasScroll && canScrollRight)
      }
    }

    const recentlyPlayedEl = recentlyPlayedRef.current
    const playlistsEl = playlistsRef.current
    const mostRecentTracksEl = mostRecentTracksRef.current

    recentlyPlayedEl?.addEventListener('scroll', handleRecentlyPlayedScroll)
    playlistsEl?.addEventListener('scroll', handlePlaylistsScroll)
    mostRecentTracksEl?.addEventListener('scroll', handleMostRecentTracksScroll)

    return () => {
      recentlyPlayedEl?.removeEventListener('scroll', handleRecentlyPlayedScroll)
      playlistsEl?.removeEventListener('scroll', handlePlaylistsScroll)
      mostRecentTracksEl?.removeEventListener('scroll', handleMostRecentTracksScroll)
    }
  }, [recentlyPlayed.length, playlists.length, mostRecentTracks.length])

  if (status === "unauthenticated") {
    return <NotSignedIn />
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400"></div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="w-full px-12 py-8 pb-32">
        <div className="flex gap-6">
          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Recently Played Section */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-6">Recently Played</h2>
              {recentlyPlayed.length === 0 ? (
                <div className="text-center py-12">
                  <FontAwesomeIcon icon={faMusic} className="text-6xl text-neutral-600 mb-4" />
                  <p className="text-neutral-400 text-lg mb-4">No recently played tracks</p>
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                  >
                    Explore Tracks
                  </Link>
                </div>
              ) : (
                <div className="relative">
                  {recentlyPlayedScroll > 0 && (
                    <button
                      onClick={() => scrollRecentlyPlayed('left')}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700 flex items-center justify-center text-white transition-all shadow-lg"
                    >
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                  )}
                  <div className="relative">
                    <div 
                      ref={recentlyPlayedRef}
                      className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
                      style={{ scrollBehavior: 'smooth' }}
                    >
                    {recentlyPlayed.map((track) => {
                    const isPlayingThisTrack = currentTrack?.id === track.id && isPlaying
                    const handleTrackClick = async () => {
                      if (track.isSoundCloud && !track.audioUrl) {
                        // Need to stream from Cobalt
                        try {
                          const res = await fetch('/api/soundcloud/stream', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ soundcloudUrl: track.sourceUrl })
                          })
                          if (res.ok) {
                            const data = await res.json()
                            const streamTrack = data.track
                            const trackIndex = recentlyPlayed.findIndex(t => t.id === track.id)
                            playTrack(streamTrack, trackIndex >= 0 ? trackIndex : recentlyPlayed.length, recentlyPlayed)
                          }
                        } catch (error) {
                          console.error('Failed to stream SoundCloud track:', error)
                        }
                      } else {
                        const trackIndex = tracks.findIndex(t => t.id === track.id)
                        if (trackIndex >= 0) {
                          playTrack(tracks[trackIndex], trackIndex, recentlyPlayed)
                        } else {
                          playTrack(track, tracks.length, recentlyPlayed)
                        }
                      }
                    }
                    return (
                      <div
                        key={track.id}
                        className="group flex-shrink-0 w-48 depth-card overflow-hidden"
                      >
                        <div 
                          className="aspect-square relative overflow-hidden bg-neutral-900 cursor-pointer"
                          onClick={handleTrackClick}
                        >
                          {track.artworkUrl ? (
                            <img 
                              src={track.artworkUrl} 
                              alt={track.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              onError={(e) => {
                                e.currentTarget.src = '/UnknownUser1024.png'
                              }}
                              loading="lazy"
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${track.isSoundCloud ? 'from-orange-600/20 to-red-600/20' : 'from-brand-600/20 to-purple-600/20'}`}>
                              <FontAwesomeIcon icon={faMusic} className="text-4xl text-brand-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-brand-600/90 flex items-center justify-center">
                              <FontAwesomeIcon 
                                icon={isPlayingThisTrack ? faPause : faPlay} 
                                className="text-white text-xl ml-1" 
                              />
                            </div>
                          </div>
                          {track.isSoundCloud && (
                            <div className="absolute top-2 right-2 bg-orange-500/90 text-white px-2 py-1 rounded text-xs font-semibold">
                              SC
                            </div>
                          )}
                        </div>
                        
                        <div className="p-3">
                          <Link 
                            href={`/track/${track.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="block"
                          >
                            <h3 className={`text-white font-semibold text-sm mb-1 line-clamp-2 transition-colors ${
                              track.isSoundCloud 
                                ? 'group-hover:text-orange-500' 
                                : 'group-hover:text-brand-400'
                            }`}>
                              {track.title}
                            </h3>
                          </Link>
                          {track.artist?.uid && !track.isSoundCloud ? (
                            <Link 
                              href={`/u/${track.artist.uid}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block"
                            >
                              <p className="text-neutral-400 text-xs truncate hover:text-brand-400 transition-colors">
                                {track.artist.name}
                              </p>
                            </Link>
                          ) : track.artist?.soundcloudUrl || track.artist?.permalink ? (
                            <a 
                              href={track.artist.soundcloudUrl || `https://soundcloud.com/${track.artist.permalink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="block"
                            >
                              <p className="text-neutral-400 text-xs truncate hover:text-orange-500 transition-colors">
                                {track.artist.name}
                              </p>
                            </a>
                          ) : (
                            <p className="text-neutral-400 text-xs truncate">
                              {track.artist?.name || 'Unknown Artist'}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                    </div>
                    {/* Fade gradient at the end */}
                    {showRecentlyPlayedRightArrow && (
                      <div className="absolute right-0 top-0 bottom-4 w-24 bg-gradient-to-l from-neutral-900 via-neutral-800/90 to-transparent pointer-events-none z-[5]" />
                    )}
                  </div>
                  {showRecentlyPlayedRightArrow && (
                    <button
                      onClick={() => scrollRecentlyPlayed('right')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700 flex items-center justify-center text-white transition-all shadow-lg"
                    >
                      <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Playlists Section */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-6">Playlists</h2>
              {playlists.length === 0 ? (
                <div className="text-center py-12">
                  <FontAwesomeIcon icon={faMusic} className="text-6xl text-neutral-600 mb-4" />
                  <p className="text-neutral-400 text-lg mb-4">No playlists yet</p>
                  <Link
                    href="/library"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                  >
                    Create Playlist
                  </Link>
                </div>
              ) : (
                <div className="relative">
                  {playlistsScroll > 0 && (
                    <button
                      onClick={() => scrollPlaylists('left')}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700 flex items-center justify-center text-white transition-all shadow-lg"
                    >
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                  )}
                  <div className="relative">
                    <div 
                      ref={playlistsRef}
                      className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
                      style={{ scrollBehavior: 'smooth' }}
                    >
                    {playlists.map((playlist) => (
                      <Link
                        key={playlist.id}
                        href={`/playlist/${playlist.id}`}
                        className="group flex-shrink-0 w-48 depth-card overflow-hidden"
                      >
                        <div className="aspect-square relative overflow-hidden bg-neutral-900">
                          {playlist.image ? (
                            <img 
                              src={playlist.image} 
                              alt={playlist.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              crossOrigin="anonymous"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-600/20 to-purple-600/20">
                              <FontAwesomeIcon icon={faMusic} className="text-4xl text-brand-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-brand-600/90 flex items-center justify-center">
                              <FontAwesomeIcon icon={faPlay} className="text-white text-xl ml-1" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="p-3">
                          <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2 group-hover:text-brand-400 transition-colors">
                            {playlist.name}
                          </h3>
                          <p className="text-neutral-400 text-xs">
                            {playlist.trackCount || 0} {playlist.trackCount === 1 ? 'track' : 'tracks'}
                          </p>
                        </div>
                      </Link>
                    ))}
                    </div>
                    {/* Fade gradient at the end */}
                    {showPlaylistsRightArrow && (
                      <div className="absolute right-0 top-0 bottom-4 w-24 bg-gradient-to-l from-neutral-900 via-neutral-800/90 to-transparent pointer-events-none z-[5]" />
                    )}
                  </div>
                  {showPlaylistsRightArrow && (
                    <button
                      onClick={() => scrollPlaylists('right')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700 flex items-center justify-center text-white transition-all shadow-lg"
                    >
                      <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Most Recent Tracks Section */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-6">Most Recent Tracks</h2>
              {mostRecentTracks.length === 0 ? (
                <div className="text-center py-12">
                  <FontAwesomeIcon icon={faMusic} className="text-6xl text-neutral-600 mb-4" />
                  <p className="text-neutral-400 text-lg mb-4">No tracks yet</p>
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                  >
                    Explore Tracks
                  </Link>
                </div>
              ) : (
                <div className="relative">
                  {mostRecentTracksScroll > 0 && (
                    <button
                      onClick={() => scrollMostRecentTracks('left')}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700 flex items-center justify-center text-white transition-all shadow-lg"
                    >
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                  )}
                  <div className="relative">
                    <div 
                      ref={mostRecentTracksRef}
                      className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
                      style={{ scrollBehavior: 'smooth' }}
                    >
                    {mostRecentTracks.map((track) => {
                      const isPlayingThisTrack = currentTrack?.id === track.id && isPlaying
                      return (
                        <div
                          key={track.id}
                          className="group flex-shrink-0 w-48 depth-card overflow-hidden"
                        >
                          <div 
                            className="aspect-square relative overflow-hidden bg-neutral-900 cursor-pointer"
                            onClick={() => {
                              const trackIndex = tracks.findIndex(t => t.id === track.id)
                              if (trackIndex >= 0) {
                                playTrack(tracks[trackIndex], trackIndex, mostRecentTracks)
                              } else {
                                playTrack(track, tracks.length, mostRecentTracks)
                              }
                            }}
                          >
                            {track.artworkUrl ? (
                              <img 
                                src={track.artworkUrl} 
                                alt={track.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.src = '/UnknownUser1024.png'
                                }}
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-600/20 to-purple-600/20">
                                <FontAwesomeIcon icon={faMusic} className="text-4xl text-brand-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="w-16 h-16 rounded-full bg-brand-600/90 flex items-center justify-center">
                                <FontAwesomeIcon 
                                  icon={isPlayingThisTrack ? faPause : faPlay} 
                                  className="text-white text-xl ml-1" 
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-3">
                            <Link 
                              href={`/track/${track.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="block"
                            >
                              <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2 group-hover:text-brand-400 transition-colors">
                                {track.title}
                              </h3>
                            </Link>
                            {track.artist?.uid && (
                              <Link 
                                href={`/u/${track.artist.uid}`}
                                onClick={(e) => e.stopPropagation()}
                                className="block"
                              >
                                <p className="text-neutral-400 text-xs truncate hover:text-brand-400 transition-colors">
                                  {track.artist.name}
                                </p>
                              </Link>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    </div>
                    {/* Fade gradient at the end */}
                    {showMostRecentTracksRightArrow && (
                      <div className="absolute right-0 top-0 bottom-4 w-24 bg-gradient-to-l from-neutral-900 via-neutral-800/90 to-transparent pointer-events-none z-[5]" />
                    )}
                  </div>
                  {showMostRecentTracksRightArrow && (
                    <button
                      onClick={() => scrollMostRecentTracks('right')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-neutral-800/90 hover:bg-neutral-700 border border-neutral-700 flex items-center justify-center text-white transition-all shadow-lg"
                    >
                      <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-72 flex-shrink-0 space-y-6">
            {/* Liked Tracks Section */}
            <div className="depth-sidebar p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">
                  {totalLikes} {totalLikes === 1 ? 'LIKE' : 'LIKES'}
                </h3>
                <Link 
                  href="/library" 
                  className="text-xs text-neutral-400 hover:text-brand-400 transition-colors"
                >
                  View all
                </Link>
              </div>
              {likedTracks.length === 0 ? (
                <p className="text-neutral-400 text-sm">No liked tracks yet</p>
              ) : (
                <div className="space-y-3">
                  {likedTracks.map((track) => (
                    <Link
                      key={track.id}
                      href={`/track/${track.id}`}
                      className="flex items-center gap-3 group hover:bg-neutral-700/30 rounded-lg p-2 -mx-2 transition-colors"
                    >
                      <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-neutral-900">
                        {track.artworkUrl ? (
                          <img 
                            src={track.artworkUrl} 
                            alt={track.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/UnknownUser1024.png'
                            }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-600/20 to-purple-600/20">
                            <FontAwesomeIcon icon={faMusic} className="text-lg text-brand-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate group-hover:text-brand-400 transition-colors">
                          {track.title}
                        </p>
                        <p className="text-neutral-400 text-xs truncate">
                          {track.artist?.name || 'Unknown Artist'}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                          <span className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faHeart} /> {track.likeCount || 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faComment} /> {track.commentCount || 0}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Listening History Section */}
            <div className="depth-sidebar p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">LISTENING HISTORY</h3>
                <Link 
                  href="/history" 
                  className="text-xs text-neutral-400 hover:text-brand-400 transition-colors"
                >
                  View all
                </Link>
              </div>
              {listeningHistory.length === 0 ? (
                <p className="text-neutral-400 text-sm">No listening history yet</p>
              ) : (
                <div className="space-y-3">
                  {listeningHistory.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/track/${entry.track.id}`}
                      className="flex items-center gap-3 group hover:bg-neutral-700/30 rounded-lg p-2 -mx-2 transition-colors"
                    >
                      <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-neutral-900">
                        {entry.track.artworkUrl ? (
                          <img 
                            src={entry.track.artworkUrl} 
                            alt={entry.track.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = '/UnknownUser1024.png'
                            }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-600/20 to-purple-600/20">
                            <FontAwesomeIcon icon={faMusic} className="text-lg text-brand-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate group-hover:text-brand-400 transition-colors">
                          {entry.track.title}
                        </p>
                        <p className="text-neutral-400 text-xs">
                          {formatRelativeTime(new Date(entry.playedAt))}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
