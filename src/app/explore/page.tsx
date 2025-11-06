"use client"
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faPlay, faPause, faHeart, faComment, faMusic } from '@fortawesome/free-solid-svg-icons'
import { faSoundcloud } from '@fortawesome/free-brands-svg-icons'
import NotSignedIn from '@/components/NotSignedIn'
import { useAudioPlayer } from '@/contexts/AudioPlayerContext'
import { formatDuration } from '@/lib/timeUtils'
import { getTrackArtwork } from '@/lib/images'
import DownloadingPopup from '@/components/DownloadingPopup'
import Link from 'next/link'

export default function ExplorePage() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const { tracks, playTrack, currentTrack, isPlaying, imageErrors, handleImageError } = useAudioPlayer()
  const [allTracks, setAllTracks] = useState<any[]>([])
  const [soundcloudTracks, setSoundcloudTracks] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [downloadingTrack, setDownloadingTrack] = useState<string | null>(null)

  useEffect(() => {
    const searchParam = searchParams.get('search')
    if (searchParam) {
      setSearchQuery(searchParam)
    }
  }, [searchParams])

  useEffect(() => {
    async function loadTracks() {
      setLoading(true)
      try {
        const searchParam = searchParams.get('search')
        // Only load tracks if there's a search query
        if (searchParam && searchParam.trim()) {
          // Load regular tracks
          const url = `/api/tracks?search=${encodeURIComponent(searchParam)}&take=100`
          const res = await fetch(url)
          if (res.ok) {
            const data = await res.json()
            setAllTracks(data.tracks || [])
          }
          
          // Load SoundCloud tracks
          const soundcloudUrl = `/api/soundcloud/search?q=${encodeURIComponent(searchParam)}`
          const scRes = await fetch(soundcloudUrl)
          if (scRes.ok) {
            const scData = await scRes.json()
            setSoundcloudTracks(scData.tracks || [])
          }
        } else {
          // No search query - show empty state
          setAllTracks([])
          setSoundcloudTracks([])
        }
      } catch (error) {
        console.error('Failed to load tracks:', error)
        setAllTracks([])
        setSoundcloudTracks([])
      } finally {
        setLoading(false)
      }
    }
    loadTracks()
  }, [searchParams])
  
  const handleSoundCloudTrackClick = async (track: any) => {
    try {
      setDownloadingTrack(track.title)
      
      // Get streaming URL from Cobalt
      const res = await fetch('/api/soundcloud/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soundcloudUrl: track.sourceUrl })
      })
      
      if (!res.ok) {
        throw new Error('Failed to get streaming URL')
      }
      
      const data = await res.json()
      const streamTrack = data.track
      
      // Add to tracks array and play
      // Use soundcloudTracks as context for autoplay to continue through SoundCloud section
      const allTracksList = [...allTracks, ...soundcloudTracks]
      const trackIndex = allTracksList.findIndex(t => t.id === streamTrack.id)
      const scIndex = soundcloudTracks.findIndex(t => t.id === track.id)
      // Use soundcloudTracks as context so autoplay continues through SoundCloud section
      playTrack(streamTrack, trackIndex >= 0 ? trackIndex : allTracksList.length, soundcloudTracks)
      
      setDownloadingTrack(null)
    } catch (error) {
      console.error('Failed to stream SoundCloud track:', error)
      setDownloadingTrack(null)
      alert('Failed to stream track. Please try again.')
    }
  }


  if (status === "unauthenticated") {
    return <NotSignedIn />
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="max-w-7xl mx-auto px-6 py-8 pb-32">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-6">Explore</h1>
        </div>

        <DownloadingPopup isVisible={!!downloadingTrack} trackTitle={downloadingTrack || undefined} />
        
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400"></div>
          </div>
        ) : allTracks.length === 0 && soundcloudTracks.length === 0 ? (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faMusic} className="text-6xl text-neutral-600 mb-4" />
            <p className="text-neutral-400 text-lg">No tracks found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Regular Tracks */}
            {allTracks.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Your Tracks</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {allTracks.map((track, index) => (
              <div
                key={track.id}
                className="group depth-card overflow-hidden"
              >
                <div 
                  className="aspect-square relative overflow-hidden bg-neutral-900 cursor-pointer"
                  onClick={() => {
                    const trackIndex = tracks.findIndex(t => t.id === track.id)
                    if (trackIndex >= 0) {
                      playTrack(tracks[trackIndex], trackIndex, allTracks)
                    } else {
                      playTrack(track, index, allTracks)
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
                        icon={currentTrack?.id === track.id && isPlaying ? faPause : faPlay} 
                        className="text-white text-xl ml-1" 
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
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
                  <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faHeart} /> {track.likeCount || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <FontAwesomeIcon icon={faComment} /> {track.commentCount || 0}
                    </span>
                    {track.duration && (
                      <span>{formatDuration(track.duration)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
                </div>
              </div>
            )}
            
            {/* SoundCloud Tracks */}
            {soundcloudTracks.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faSoundcloud} className="text-orange-500" />
                  SoundCloud
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {soundcloudTracks.map((track, index) => (
                    <div
                      key={track.id}
                      className="group depth-card overflow-hidden"
                    >
                      <div 
                        className="aspect-square relative overflow-hidden bg-neutral-900 cursor-pointer"
                        onClick={() => handleSoundCloudTrackClick(track)}
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
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-600/20 to-red-600/20">
                            <FontAwesomeIcon icon={faSoundcloud} className="text-4xl text-orange-500" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-brand-600/90 flex items-center justify-center">
                            <FontAwesomeIcon 
                              icon={faPlay} 
                              className="text-white text-xl ml-1" 
                            />
                          </div>
                        </div>
                        <div className="absolute top-2 right-2 bg-orange-500/90 text-white px-2 py-1 rounded text-xs font-semibold">
                          SC
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <h3 className="text-white font-semibold text-sm mb-1 line-clamp-2 group-hover:text-brand-400 transition-colors">
                          {track.title}
                        </h3>
                        {track.artist?.permalink ? (
                          <a 
                            href={`https://soundcloud.com/${track.artist.permalink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="block"
                          >
                            <p className="text-neutral-400 text-xs truncate hover:text-orange-500 transition-colors flex items-center gap-1">
                              {track.artist.name}
                              <FontAwesomeIcon icon={faSoundcloud} className="text-xs" />
                            </p>
                          </a>
                        ) : (
                          <p className="text-neutral-400 text-xs truncate">
                            {track.artist?.name || 'Unknown Artist'}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
                          <span className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faHeart} /> {track.likeCount || 0}
                          </span>
                          {track.duration && (
                            <span>{formatDuration(track.duration)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

