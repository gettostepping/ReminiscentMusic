"use client"
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMusic, faPlay, faTrash, faPause } from '@fortawesome/free-solid-svg-icons'
import NotSignedIn from '@/components/NotSignedIn'
import { useAudioPlayer } from '@/contexts/AudioPlayerContext'
import { useToast } from '@/hooks/useToast'
import { getUserAvatar, getTrackArtwork } from '@/lib/images'
import { formatDuration } from '@/lib/timeUtils'
import Image from 'next/image'
import Link from 'next/link'

export default function PlaylistDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { tracks, playTrack, currentTrack, isPlaying, imageErrors, handleImageError } = useAudioPlayer()
  const { showSuccess, showError } = useToast()
  const [playlist, setPlaylist] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadPlaylist() {
      try {
        const res = await fetch(`/api/playlists/${id}`)
        if (res.ok) {
          const data = await res.json()
          setPlaylist(data.playlist)
        }
      } catch (error) {
        console.error('Failed to load playlist:', error)
      } finally {
        setLoading(false)
      }
    }
    if (id) {
      loadPlaylist()
    }
  }, [id])

  async function handleRemoveTrack(trackId: string) {
    if (!confirm('Remove this track from the playlist?')) return

    try {
      const res = await fetch(`/api/playlists/${id}/tracks?trackId=${trackId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setPlaylist((prev: any) => ({
          ...prev,
          tracks: prev.tracks.filter((t: any) => t.id !== trackId)
        }))
        showSuccess('Track removed')
      } else {
        showError('Failed to remove track')
      }
    } catch (error) {
      console.error('Failed to remove track:', error)
      showError('Failed to remove track')
    }
  }

  function handlePlayAll() {
    if (playlist && playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], 0, playlist.tracks || [])
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

  if (!playlist) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Playlist not found</h1>
          <button
            onClick={() => router.push('/library')}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
          >
            Go to Library
          </button>
        </div>
      </main>
    )
  }

  const isOwner = session?.user?.email && playlist.ownerId === session.user.id

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="max-w-6xl mx-auto px-6 py-8 pb-32">
        <div className="mb-8">
          <div className="relative h-64 bg-gradient-to-br from-brand-600/20 to-purple-600/20 rounded-xl overflow-hidden mb-6 flex items-center justify-center">
            {playlist.image ? (
              <img 
                src={playlist.image} 
                alt={playlist.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <FontAwesomeIcon icon={faMusic} className="text-8xl text-brand-400/50" />
            )}
          </div>

          <div className="flex items-start gap-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">{playlist.name}</h1>
              <Link href={`/u/${playlist.owner.uid}`} className="flex items-center gap-2 mb-4">
                <div className="relative w-8 h-8 rounded-full overflow-hidden">
                  <Image
                    src={getUserAvatar(playlist.owner.image)}
                    alt={playlist.owner.name || 'User'}
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                </div>
                <span className="text-neutral-400 hover:text-brand-400 transition-colors">
                  {playlist.owner.name}
                </span>
              </Link>
              {playlist.description && (
                <p className="text-neutral-300 mb-4">{playlist.description}</p>
              )}
              <p className="text-neutral-400">{playlist.tracks.length} tracks</p>
            </div>

            <button
              onClick={handlePlayAll}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlay} />
              Play All
            </button>
          </div>
        </div>

        <div>
          {playlist.tracks.length === 0 ? (
            <p className="text-neutral-400">No tracks in this playlist yet</p>
          ) : (
            <div className="space-y-2">
              {playlist.tracks.map((track: any, index: number) => {
                const isPlayingThisTrack = currentTrack?.id === track.id && isPlaying
                return (
                  <div
                    key={track.id}
                    className="flex items-center gap-4 p-4 depth-card group"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-900 flex-shrink-0 relative group/track">
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
                        <div className="w-full h-full flex items-center justify-center">
                          <FontAwesomeIcon icon={faMusic} className="text-xl text-brand-400" />
                        </div>
                      )}
                      <div 
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/track:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          const trackIndex = tracks.findIndex(t => t.id === track.id)
                          const playlistTracks = playlist.tracks || []
                          if (trackIndex >= 0) {
                            playTrack(tracks[trackIndex], trackIndex, playlistTracks)
                          } else {
                            playTrack(track, index, playlistTracks)
                          }
                        }}
                      >
                        <FontAwesomeIcon 
                          icon={isPlayingThisTrack ? faPause : faPlay} 
                          className="text-white text-lg" 
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <Link href={`/track/${track.id}`}>
                        <h3 className="text-white font-medium truncate hover:text-brand-400 transition-colors">
                          {track.title}
                        </h3>
                      </Link>
                      {track.artist?.uid && (
                        <Link 
                          href={`/u/${track.artist.uid}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="text-neutral-400 text-sm truncate hover:text-brand-400 transition-colors">
                            {track.artist.name}
                          </p>
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {track.duration && (
                        <span className="text-neutral-400 text-sm">{formatDuration(track.duration)}</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const trackIndex = tracks.findIndex(t => t.id === track.id)
                          const playlistTracks = playlist.tracks || []
                          if (trackIndex >= 0) {
                            playTrack(tracks[trackIndex], trackIndex, playlistTracks)
                          } else {
                            playTrack(track, index, playlistTracks)
                          }
                        }}
                        className="text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        <FontAwesomeIcon icon={isPlayingThisTrack ? faPause : faPlay} />
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => handleRemoveTrack(track.id)}
                          className="text-red-400 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

