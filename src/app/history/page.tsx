"use client"
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faPlay, 
  faPause, 
  faMusic, 
  faHeart, 
  faComment, 
  faShare, 
  faDownload,
  faEllipsisV,
  faLock,
  faClock
} from '@fortawesome/free-solid-svg-icons'
import { faSoundcloud } from '@fortawesome/free-brands-svg-icons'
import NotSignedIn from '@/components/NotSignedIn'
import { useAudioPlayer } from '@/contexts/AudioPlayerContext'
import { formatDuration, formatRelativeTime } from '@/lib/timeUtils'
import { getTrackArtwork } from '@/lib/images'
import Link from 'next/link'

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const { tracks, playTrack, currentTrack, isPlaying, imageErrors, handleImageError } = useAudioPlayer()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/listening-history?limit=1000')
        if (res.ok) {
          const data = await res.json()
          setHistory(data.history || [])
        }
      } catch (error) {
        console.error('Failed to load history:', error)
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [])

  if (status === "unauthenticated") {
    return <NotSignedIn />
  }

  const filteredHistory = history.filter(entry => {
    const track = entry.track
    const title = track.title?.toLowerCase() || ''
    const artist = track.artist?.name?.toLowerCase() || ''
    const query = searchQuery.toLowerCase()
    return title.includes(query) || artist.includes(query)
  })

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400"></div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="max-w-7xl mx-auto px-6 py-8 pb-32">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Listening History</h1>
          <p className="text-neutral-400">{history.length} {history.length === 1 ? 'track' : 'tracks'}</p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tracks"
            className="w-full max-w-md bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <FontAwesomeIcon icon={faClock} className="text-6xl text-neutral-600 mb-4" />
            <p className="text-neutral-400 text-lg">
              {searchQuery ? 'No tracks found' : 'No listening history yet'}
            </p>
          </div>
        ) : (
          <div className="depth-section overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[auto_1fr_80px_120px_180px_120px_40px] gap-4 px-6 py-3 border-b border-neutral-700/50 text-xs font-semibold text-neutral-400 uppercase">
              <div className="w-10"></div>
              <div>TRACKS</div>
              <div>DURATION</div>
              <div>DATE</div>
              <div className="text-center">ENGAGEMENTS</div>
              <div className="text-right">PLAYS</div>
              <div></div>
            </div>

            {/* Track List */}
            <div className="divide-y divide-neutral-700/50">
              {filteredHistory.map((entry) => {
                const track = entry.track
                const isPlayingThisTrack = currentTrack?.id === track.id && isPlaying
                const trackIndex = tracks.findIndex(t => t.id === track.id)
                
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
                        const historyTracks = history.map((entry: any) => entry.track)
                        const trackIdx = historyTracks.findIndex(t => t.id === track.id)
                        playTrack(streamTrack, trackIdx >= 0 ? trackIdx : historyTracks.length, historyTracks)
                      }
                    } catch (error) {
                      console.error('Failed to stream SoundCloud track:', error)
                    }
                  } else {
                    const historyTracks = history.map((entry: any) => entry.track)
                    if (trackIndex >= 0) {
                      playTrack(tracks[trackIndex], trackIndex, historyTracks)
                    } else {
                      playTrack(track, tracks.length, historyTracks)
                    }
                  }
                }
                
                return (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[auto_1fr_80px_120px_180px_120px_40px] gap-4 px-6 py-3 hover:bg-neutral-700/30 transition-colors group items-center"
                  >
                    {/* Checkbox placeholder */}
                    <div className="w-10"></div>

                    {/* Track Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-neutral-900 relative group/track">
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
                          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${track.isSoundCloud ? 'from-orange-600/20 to-red-600/20' : 'from-brand-600/20 to-purple-600/20'}`}>
                            <FontAwesomeIcon icon={track.isSoundCloud ? faSoundcloud : faMusic} className={`text-lg ${track.isSoundCloud ? 'text-orange-500' : 'text-brand-400'}`} />
                          </div>
                        )}
                        <div 
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover/track:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                          onClick={handleTrackClick}
                        >
                          <FontAwesomeIcon 
                            icon={isPlayingThisTrack ? faPause : faPlay} 
                            className="text-white text-sm" 
                          />
                        </div>
                        {track.isSoundCloud && (
                          <div className="absolute top-1 right-1 bg-orange-500/90 text-white px-1.5 py-0.5 rounded text-[10px] font-semibold">
                            SC
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!track.isSoundCloud ? (
                            <Link 
                              href={`/track/${track.id}`}
                              className="text-white font-medium hover:text-brand-400 transition-colors truncate"
                            >
                              {track.title}
                            </Link>
                          ) : (
                            <span className="text-white font-medium truncate">
                              {track.title}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {track.isSoundCloud && (track.artist?.soundcloudUrl || track.artist?.permalink) ? (
                            <a 
                              href={track.artist.soundcloudUrl || `https://soundcloud.com/${track.artist.permalink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-neutral-400 text-sm hover:text-orange-500 transition-colors truncate flex items-center gap-1"
                            >
                              {track.artist?.name || 'Unknown Artist'}
                              <FontAwesomeIcon icon={faSoundcloud} className="text-xs" />
                            </a>
                          ) : track.artist?.uid && !track.isSoundCloud ? (
                            <Link 
                              href={`/u/${track.artist.uid}`}
                              className="text-neutral-400 text-sm hover:text-brand-400 transition-colors truncate"
                            >
                              {track.artist?.name || 'Unknown Artist'}
                            </Link>
                          ) : (
                            <span className="text-neutral-400 text-sm truncate">
                              {track.artist?.name || 'Unknown Artist'}
                            </span>
                          )}
                          {!track.isPublic && !track.isSoundCloud && (
                            <FontAwesomeIcon icon={faLock} className="text-neutral-500 text-xs" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="text-neutral-400 text-sm">
                      {track.duration ? formatDuration(track.duration) : '--'}
                    </div>

                    {/* Date */}
                    <div className="text-neutral-400 text-sm">
                      {formatRelativeTime(new Date(entry.playedAt))}
                    </div>

                    {/* Engagements */}
                    <div className="flex items-center justify-center gap-4 text-neutral-500">
                      <div className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faHeart} className="text-xs" />
                        <span className="text-xs">{track.likeCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faComment} className="text-xs" />
                        <span className="text-xs">{track.commentCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faShare} className="text-xs" />
                        <span className="text-xs">{track.repostCount || 0}</span>
                      </div>
                    </div>

                    {/* Plays */}
                    <div className="text-white font-semibold text-right">
                      {track.playCount || 0}
                    </div>

                    {/* Menu */}
                    <div className="flex justify-center">
                      <button className="text-neutral-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                        <FontAwesomeIcon icon={faEllipsisV} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

