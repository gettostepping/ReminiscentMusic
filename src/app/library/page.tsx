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
  faUnlock
} from '@fortawesome/free-solid-svg-icons'
import { faSoundcloud } from '@fortawesome/free-brands-svg-icons'
import NotSignedIn from '@/components/NotSignedIn'
import ImportSoundCloudLikes from '@/components/ImportSoundCloudLikes'
import { useAudioPlayer } from '@/contexts/AudioPlayerContext'
import { formatDuration, formatRelativeTime } from '@/lib/timeUtils'
import { getTrackArtwork } from '@/lib/images'
import Link from 'next/link'
import Image from 'next/image'

export default function LibraryPage() {
  const { data: session, status } = useSession()
  const { tracks, playTrack, currentTrack, isPlaying, imageErrors, handleImageError } = useAudioPlayer()
  const [playlists, setPlaylists] = useState<any[]>([])
  const [likedTracks, setLikedTracks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [playlistSearchQuery, setPlaylistSearchQuery] = useState('')
  const [likesSearchQuery, setLikesSearchQuery] = useState('')
  const [showImportModal, setShowImportModal] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [playlistsRes, likesRes] = await Promise.all([
          fetch('/api/playlists?myPlaylists=true'),
          fetch('/api/likes?limit=1000')
        ])
        
        if (playlistsRes.ok) {
          const playlistsData = await playlistsRes.json()
          setPlaylists(playlistsData.playlists || [])
        }
        
        if (likesRes.ok) {
          const likesData = await likesRes.json()
          setLikedTracks(likesData.likes || [])
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleImportComplete = async () => {
    // Reload likes after import
    try {
      const likesRes = await fetch('/api/likes?limit=1000')
      if (likesRes.ok) {
        const likesData = await likesRes.json()
        setLikedTracks(likesData.likes || [])
      }
    } catch (error) {
      console.error('Failed to reload likes:', error)
    }
  }

  if (status === "unauthenticated") {
    return <NotSignedIn />
  }

  const filteredTracks = likedTracks.filter(track => {
    const title = track.title?.toLowerCase() || ''
    const artist = track.artist?.name?.toLowerCase() || ''
    const query = likesSearchQuery.toLowerCase()
    return title.includes(query) || artist.includes(query)
  })

  const filteredPlaylists = playlists.filter(p => 
    p.name.toLowerCase().includes(playlistSearchQuery.toLowerCase()) ||
    p.owner?.name?.toLowerCase().includes(playlistSearchQuery.toLowerCase())
  )

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
          <h1 className="text-4xl font-bold text-white mb-2">Library</h1>
        </div>

        {/* Playlists Section */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-4">Playlists</h2>
            <input
              type="text"
              value={playlistSearchQuery}
              onChange={(e) => setPlaylistSearchQuery(e.target.value)}
              placeholder="Search playlists"
              className="w-full max-w-md bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {filteredPlaylists.length === 0 ? (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faMusic} className="text-6xl text-neutral-600 mb-4" />
                <p className="text-neutral-400 text-lg">
                  {playlistSearchQuery ? 'No playlists found' : 'No playlists yet'}
                </p>
              </div>
            ) : (
              <div className="depth-section overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[auto_1fr_80px_120px_120px_40px] gap-4 px-6 py-3 border-b border-neutral-700/50 text-xs font-semibold text-neutral-400 uppercase">
                  <div className="w-10"></div>
                  <div>PLAYLISTS</div>
                  <div>TRACKS</div>
                  <div>DURATION</div>
                  <div>DATE</div>
                  <div></div>
                </div>

                {/* Playlist List */}
                <div className="divide-y divide-neutral-700/50">
                  {filteredPlaylists.map((playlist) => (
                    <Link
                      key={playlist.id}
                      href={`/playlist/${playlist.id}`}
                      className="grid grid-cols-[auto_1fr_80px_120px_120px_40px] gap-4 px-6 py-3 hover:bg-neutral-700/30 transition-colors group items-center"
                    >
                      {/* Checkbox placeholder */}
                      <div className="w-10"></div>

                      {/* Playlist Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-neutral-900 relative group/playlist">
                          {playlist.image ? (
                            <img 
                              src={playlist.image} 
                              alt={playlist.name}
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-600/20 to-purple-600/20">
                              <FontAwesomeIcon icon={faMusic} className="text-lg text-brand-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/playlist:opacity-100 transition-opacity flex items-center justify-center">
                            <FontAwesomeIcon 
                              icon={faPlay} 
                              className="text-white text-sm ml-1" 
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium hover:text-brand-400 transition-colors truncate">
                              {playlist.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Link 
                              href={playlist.owner?.uid ? `/u/${playlist.owner.uid}` : '#'}
                              onClick={(e) => e.stopPropagation()}
                              className="text-neutral-400 text-sm hover:text-brand-400 transition-colors truncate"
                            >
                              {playlist.owner?.name || 'Unknown'}
                            </Link>
                            {!playlist.isPublic && (
                              <FontAwesomeIcon icon={faLock} className="text-neutral-500 text-xs" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Track Count */}
                      <div className="text-neutral-400 text-sm">
                        {playlist.trackCount || 0}
                      </div>

                      {/* Total Duration */}
                      <div className="text-neutral-400 text-sm">
                        {playlist.totalDuration && playlist.totalDuration > 0 ? formatDuration(playlist.totalDuration) : '--'}
                      </div>

                      {/* Date */}
                      <div className="text-neutral-400 text-sm">
                        {formatRelativeTime(new Date(playlist.createdAt))}
                      </div>

                      {/* Menu */}
                      <div className="flex justify-center">
                        <button 
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          className="text-neutral-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <FontAwesomeIcon icon={faEllipsisV} />
                        </button>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Liked Tracks Section */}
        <div>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Liked Tracks</h2>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-sm font-semibold"
              >
                <FontAwesomeIcon icon={faSoundcloud} />
                <span>Import from SoundCloud</span>
              </button>
            </div>
            <input
              type="text"
              value={likesSearchQuery}
              onChange={(e) => setLikesSearchQuery(e.target.value)}
              placeholder="Search tracks"
              className="w-full max-w-md bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {filteredTracks.length === 0 ? (
              <div className="text-center py-12">
                <FontAwesomeIcon icon={faHeart} className="text-6xl text-neutral-600 mb-4" />
                <p className="text-neutral-400 text-lg">
                  {likesSearchQuery ? 'No tracks found' : 'No liked tracks yet'}
                </p>
              </div>
            ) : (
          <div className="bg-neutral-800/50 backdrop-blur-sm rounded-xl border border-neutral-700/50 overflow-hidden">
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
              {filteredTracks.map((track) => {
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
                        const trackIdx = likedTracks.findIndex(t => t.id === track.id)
                        playTrack(streamTrack, trackIdx >= 0 ? trackIdx : likedTracks.length, likedTracks)
                      }
                    } catch (error) {
                      console.error('Failed to stream SoundCloud track:', error)
                    }
                  } else {
                    if (trackIndex >= 0) {
                      playTrack(tracks[trackIndex], trackIndex, likedTracks)
                    } else {
                      playTrack(track, tracks.length, likedTracks)
                    }
                  }
                }
                
                return (
                  <div
                    key={track.id}
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
                      {track.likedAt ? formatRelativeTime(new Date(track.likedAt)) : '--'}
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
      </div>

      <ImportSoundCloudLikes
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleImportComplete}
      />
    </main>
  )
}
