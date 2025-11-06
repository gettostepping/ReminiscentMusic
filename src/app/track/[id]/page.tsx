"use client"
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faPlay, 
  faPause, 
  faHeart, 
  faComment, 
  faShare, 
  faMusic,
  faUser,
  faPlus,
  faTrash
} from '@fortawesome/free-solid-svg-icons'
import NotSignedIn from '@/components/NotSignedIn'
import { useAudioPlayer } from '@/contexts/AudioPlayerContext'
import { useToast } from '@/hooks/useToast'
import { formatDuration, formatRelativeTime } from '@/lib/timeUtils'
import { getTrackArtwork, getUserAvatar } from '@/lib/images'
import Link from 'next/link'
import Image from 'next/image'

export default function TrackDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { tracks, playTrack, currentTrack, isPlaying, imageErrors, handleImageError } = useAudioPlayer()
  const { showSuccess, showError } = useToast()
  const [track, setTrack] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [isLiked, setIsLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [playlists, setPlaylists] = useState<any[]>([])
  const [contextTracks, setContextTracks] = useState<any[]>([])
  const [showPlaylistModal, setShowPlaylistModal] = useState(false)

  useEffect(() => {
    async function loadTrack() {
      try {
        const res = await fetch(`/api/tracks/${id}`)
        if (res.ok) {
          const data = await res.json()
          setTrack(data.track)
          setIsLiked(data.track.isLiked || false)
        }
      } catch (error) {
        console.error('Failed to load track:', error)
      } finally {
        setLoading(false)
      }
    }

    async function loadComments() {
      // SoundCloud tracks don't have comments
      if (id && id.toString().startsWith('soundcloud_')) {
        setComments([])
        return
      }
      
      try {
        const res = await fetch(`/api/tracks/${id}/comments`)
        if (res.ok) {
          const data = await res.json()
          setComments(data.comments || [])
        }
      } catch (error) {
        console.error('Failed to load comments:', error)
      }
    }

    async function loadRecommendations() {
      try {
        const res = await fetch(`/api/tracks/recommendations?trackId=${id}`)
        if (res.ok) {
          const data = await res.json()
          setContextTracks(data.recommendations || [])
        }
      } catch (error) {
        console.error('Failed to load recommendations:', error)
      }
    }

    if (id) {
      loadTrack()
      loadComments()
      loadRecommendations()
    }
  }, [id])

  useEffect(() => {
    if (session && track) {
      loadPlaylists()
    }
  }, [session, track])

  async function loadPlaylists() {
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

  async function handleLike() {
    if (!session) {
      showError('Please sign in to like tracks')
      return
    }

    try {
      // Check if it's a SoundCloud track
      if (track?.isSoundCloud && track?.soundcloudId) {
        const res = await fetch('/api/soundcloud/like', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            soundcloudTrackId: track.soundcloudId,
            title: track.title,
            artist: track.artist?.name,
            artworkUrl: track.artworkUrl,
            audioUrl: track.audioUrl,
            sourceUrl: track.sourceUrl,
            duration: track.duration
          })
        })
        
        if (res.ok) {
          const data = await res.json()
          setIsLiked(data.liked)
          // Fetch updated like count
          const trackRes = await fetch(`/api/tracks/${id}`)
          if (trackRes.ok) {
            const trackData = await trackRes.json()
            setTrack(trackData.track)
          }
        }
      } else {
        const res = await fetch(`/api/tracks/${id}/like`, { method: 'POST' })
        if (res.ok) {
          const data = await res.json()
          setIsLiked(data.liked)
          setTrack((prev: any) => ({
            ...prev,
            likeCount: prev.likeCount + (data.liked ? 1 : -1)
          }))
        }
      }
    } catch (error) {
      console.error('Failed to like track:', error)
      showError('Failed to like track')
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || !session) return

    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/tracks/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newComment })
      })

      if (res.ok) {
        const data = await res.json()
        setComments([data.comment, ...comments])
        setNewComment('')
        showSuccess('Comment added')
      } else {
        showError('Failed to add comment')
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
      showError('Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleAddToPlaylist(playlistId: string) {
    try {
      const res = await fetch(`/api/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: id })
      })

      if (res.ok) {
        showSuccess('Added to playlist')
        setShowPlaylistModal(false)
      } else {
        showError('Failed to add to playlist')
      }
    } catch (error) {
      console.error('Failed to add to playlist:', error)
      showError('Failed to add to playlist')
    }
  }

  function handlePlay() {
    if (track) {
      // Handle SoundCloud tracks that need streaming URL
      if (track.isSoundCloud && (!track.audioUrl || track.audioUrl.trim() === '') && track.sourceUrl) {
        // Fetch streaming URL first
        fetch('/api/soundcloud/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ soundcloudUrl: track.sourceUrl })
        })
        .then(res => res.json())
        .then(data => {
          if (data.track) {
            const streamTrack = { ...track, audioUrl: data.track.audioUrl }
            const trackIndex = tracks.findIndex(t => t.id === streamTrack.id)
            const contextList = contextTracks.length > 0 ? [streamTrack, ...contextTracks] : []
            if (trackIndex >= 0) {
              playTrack(tracks[trackIndex], trackIndex, contextList)
            } else {
              playTrack(streamTrack, 0, contextList)
            }
          }
        })
        .catch(error => {
          console.error('Failed to stream SoundCloud track:', error)
          showError('Failed to play track')
        })
      } else {
        const trackIndex = tracks.findIndex(t => t.id === track.id)
        // Use recommendations as context tracks for autoplay
        const contextList = contextTracks.length > 0 ? [track, ...contextTracks] : []
        if (trackIndex >= 0) {
          playTrack(tracks[trackIndex], trackIndex, contextList)
        } else {
          playTrack(track, 0, contextList)
        }
      }
    }
  }

  if (!session) {
    return <NotSignedIn />
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-400"></div>
      </main>
    )
  }

  if (!track) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Track not found</h1>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </main>
    )
  }

  const isPlayingThisTrack = currentTrack?.id === track.id && isPlaying

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="max-w-6xl mx-auto px-6 py-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-1">
            <div className="aspect-square rounded-xl overflow-hidden depth-section mb-4">
              {track.artworkUrl ? (
                <img 
                  src={track.artworkUrl} 
                  alt={track.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/UnknownUser1024.png'
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-600/20 to-purple-600/20">
                  <FontAwesomeIcon icon={faMusic} className="text-6xl text-brand-400" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePlay}
                className="flex-1 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={isPlayingThisTrack ? faPause : faPlay} />
                {isPlayingThisTrack ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={handleLike}
                className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                  isLiked
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-neutral-700 hover:bg-neutral-600 text-white'
                }`}
              >
                <FontAwesomeIcon icon={faHeart} />
                {track.likeCount}
              </button>
              <button
                onClick={() => setShowPlaylistModal(true)}
                className="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h1 className="text-4xl font-bold text-white mb-4">{track.title}</h1>
            {track.isSoundCloud && track.artist?.soundcloudUrl ? (
              <a 
                href={track.artist.soundcloudUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 mb-6 group"
              >
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-orange-600/20 to-red-600/20 flex items-center justify-center">
                  {track.artist.image ? (
                    <Image
                      src={track.artist.image}
                      alt={track.artist.name || 'Artist'}
                      width={96}
                      height={96}
                      quality={95}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <FontAwesomeIcon icon={faMusic} className="text-xl text-orange-500" />
                  )}
                </div>
                <div>
                  <p className="text-neutral-400 group-hover:text-orange-500 transition-colors">
                    {track.artist.name}
                  </p>
                  <p className="text-xs text-neutral-500">SoundCloud</p>
                </div>
              </a>
            ) : track.artist?.uid ? (
              <Link href={`/u/${track.artist.uid}`} className="flex items-center gap-3 mb-6 group">
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  <Image
                    src={getUserAvatar(track.artist.image)}
                    alt={track.artist.name || 'Artist'}
                    width={96}
                    height={96}
                    quality={95}
                    className="object-cover w-full h-full"
                  />
                </div>
                <div>
                  <p className="text-neutral-400 group-hover:text-brand-400 transition-colors">
                    {track.artist.name}
                  </p>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3 mb-6">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-brand-600/20 to-purple-600/20 flex items-center justify-center">
                  <FontAwesomeIcon icon={faUser} className="text-xl text-brand-400" />
                </div>
                <div>
                  <p className="text-neutral-400">
                    {track.artist?.name || 'Unknown Artist'}
                  </p>
                </div>
              </div>
            )}

            {track.description && (
              <div className="mb-6">
                <p className="text-neutral-300 whitespace-pre-wrap">{track.description}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-neutral-400 mb-6">
              {track.genre && (
                <span className="px-3 py-1 bg-neutral-800/80 backdrop-blur-sm rounded-full border border-neutral-700/40 shadow-sm">{track.genre}</span>
              )}
              {track.duration && (
                <span className="px-3 py-1 bg-neutral-800/80 backdrop-blur-sm rounded-full border border-neutral-700/40 shadow-sm">
                  {formatDuration(track.duration)}
                </span>
              )}
              <span className="px-3 py-1 bg-neutral-800/80 backdrop-blur-sm rounded-full border border-neutral-700/40 shadow-sm">
                {formatRelativeTime(track.createdAt)}
              </span>
            </div>

            <div className="flex items-center gap-6 text-neutral-400">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faHeart} />
                <span>{track.likeCount || 0} likes</span>
              </div>
              {!track.isSoundCloud && (
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faComment} />
                  <span>{comments.length} comments</span>
                </div>
              )}
              {!track.isSoundCloud && (
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faMusic} />
                  <span>{track.playCount || 0} plays</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {!track.isSoundCloud && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-white mb-6">Comments</h2>
            
            {session && (
              <form onSubmit={handleCommentSubmit} className="mb-8">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="w-full bg-neutral-800/80 backdrop-blur-sm border border-neutral-700/60 rounded-lg px-4 py-3 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none mb-2 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !newComment.trim()}
                  className="px-6 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </form>
            )}

            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-neutral-400">No comments yet. Be the first to comment!</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="depth-card p-4">
                    <div className="flex items-start gap-3">
                      <Link href={`/u/${comment.author.uid}`}>
                        <div className="relative w-10 h-10 rounded-full overflow-hidden">
                          <Image
                            src={getUserAvatar(comment.author.image)}
                            alt={comment.author.name || 'User'}
                            width={40}
                            height={40}
                            className="object-cover"
                          />
                        </div>
                      </Link>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link href={`/u/${comment.author.uid}`}>
                            <span className="text-white font-medium hover:text-brand-400 transition-colors">
                              {comment.author.name}
                            </span>
                          </Link>
                          <span className="text-neutral-500 text-sm">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-neutral-300">{comment.body}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {track.isSoundCloud && (
          <div className="mt-12">
            <div className="depth-card p-6 text-center">
              <p className="text-neutral-400 mb-4">This is a SoundCloud track</p>
              {track.sourceUrl && (
                <a
                  href={track.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  <FontAwesomeIcon icon={faMusic} />
                  View on SoundCloud
                </a>
              )}
            </div>
          </div>
        )}
      </div>

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
                    <p className="text-neutral-400 text-sm">{playlist.trackCount} tracks</p>
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
    </main>
  )
}

