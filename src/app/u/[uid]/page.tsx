"use client"
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faUser, 
  faHeart, 
  faMusic, 
  faUsers, 
  faPlay, 
  faPause, 
  faComment, 
  faShare, 
  faEllipsisV,
  faChevronDown
} from '@fortawesome/free-solid-svg-icons'
import NotSignedIn from '@/components/NotSignedIn'
import { useAudioPlayer } from '@/contexts/AudioPlayerContext'
import { useToast } from '@/hooks/useToast'
import { getUserAvatar, getTrackArtwork } from '@/lib/images'
import { formatDuration, formatRelativeTime } from '@/lib/timeUtils'
import Image from 'next/image'
import Link from 'next/link'

export default function UserProfilePage() {
  const { uid } = useParams()
  const { data: session } = useSession()
  const { tracks, playTrack, currentTrack, isPlaying, imageErrors, handleImageError } = useAudioPlayer()
  const { showSuccess, showError } = useToast()
  const [profile, setProfile] = useState<any>(null)
  const [userTracks, setUserTracks] = useState<any[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'recent' | 'likes' | 'plays'>('recent')
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch(`/api/profiles?uid=${uid}`)
        if (res.ok) {
          const data = await res.json()
          setProfile(data.user)
          setUserTracks(data.tracks || [])
          setIsFollowing(data.user.isFollowing || false)
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        setLoading(false)
      }
    }
    if (uid) {
      loadProfile()
    }
  }, [uid])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownOpen && !(event.target as HTMLElement).closest('[data-sort-dropdown]')) {
        setSortDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [sortDropdownOpen])

  async function handleFollow() {
    if (!session) {
      showError('Please sign in to follow users')
      return
    }

    try {
      const res = await fetch(`/api/users/${profile.id}/follow`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setIsFollowing(data.following)
        setProfile((prev: any) => ({
          ...prev,
          followerCount: prev.followerCount + (data.following ? 1 : -1)
        }))
      }
    } catch (error) {
      console.error('Failed to follow user:', error)
      showError('Failed to follow user')
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

  if (!profile) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">User not found</h1>
        </div>
      </main>
    )
  }

  const isCurrentUser = session?.user?.email && profile.id === session.user.id

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="max-w-6xl mx-auto px-6 py-8 pb-32">
        <div className="mb-8">
          <div className="relative h-64 bg-gradient-to-br from-brand-600/20 to-purple-600/20 rounded-xl overflow-hidden mb-6">
            {profile.banner && (
              <img 
                src={profile.banner} 
                alt="Banner"
                className="w-full h-full object-cover"
              />
            )}
          </div>

          <div className="flex items-start gap-6">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-neutral-800 -mt-16">
              <Image
                src={getUserAvatar(profile.image)}
                alt={profile.name || 'User'}
                width={512}
                height={512}
                quality={95}
                priority
                className="object-cover w-full h-full"
                unoptimized={profile.image?.startsWith('http')}
              />
            </div>

            <div className="flex-1 mt-4">
              <h1 className="text-4xl font-bold text-white mb-2">{profile.name}</h1>
              {profile.profile?.bio && (
                <p className="text-neutral-300 mb-4">{profile.profile.bio}</p>
              )}
              <div className="flex items-center gap-6 text-neutral-400 mb-4">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faMusic} />
                  <span>{profile.trackCount || 0} tracks</span>
                </div>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} />
                  <span>{profile.followerCount || 0} followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{profile.followingCount || 0} following</span>
                </div>
              </div>

              {!isCurrentUser && session && (
                <button
                  onClick={handleFollow}
                  className={`px-6 py-2 rounded-lg transition-colors ${
                    isFollowing
                      ? 'bg-neutral-700 hover:bg-neutral-600 text-white'
                      : 'bg-brand-600 hover:bg-brand-700 text-white'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Tracks</h2>
            {userTracks.length > 0 && (
              <div className="relative" data-sort-dropdown>
                <button
                  onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-neutral-800/50 hover:bg-neutral-700/50 border border-neutral-700 rounded-lg text-white text-sm transition-colors"
                >
                  <span>Sort by: {
                    sortBy === 'recent' ? 'Recently Uploaded' :
                    sortBy === 'likes' ? 'Most Liked' :
                    'Most Played'
                  }</span>
                  <FontAwesomeIcon 
                    icon={faChevronDown} 
                    className={`text-xs transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                
                {sortDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-neutral-900 border border-neutral-700 rounded-lg shadow-lg py-1 z-20">
                    <button
                      onClick={() => {
                        setSortBy('recent')
                        setSortDropdownOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        sortBy === 'recent' 
                          ? 'bg-neutral-800 text-brand-400' 
                          : 'text-white hover:bg-neutral-800/50'
                      }`}
                    >
                      Recently Uploaded
                    </button>
                    <button
                      onClick={() => {
                        setSortBy('likes')
                        setSortDropdownOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        sortBy === 'likes' 
                          ? 'bg-neutral-800 text-brand-400' 
                          : 'text-white hover:bg-neutral-800/50'
                      }`}
                    >
                      Most Liked
                    </button>
                    <button
                      onClick={() => {
                        setSortBy('plays')
                        setSortDropdownOpen(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        sortBy === 'plays' 
                          ? 'bg-neutral-800 text-brand-400' 
                          : 'text-white hover:bg-neutral-800/50'
                      }`}
                    >
                      Most Played
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {userTracks.length === 0 ? (
            <div className="text-center py-12">
              <FontAwesomeIcon icon={faMusic} className="text-6xl text-neutral-600 mb-4" />
              <p className="text-neutral-400 text-lg">No tracks yet</p>
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
                {[...userTracks].sort((a, b) => {
                  if (sortBy === 'recent') {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  } else if (sortBy === 'likes') {
                    return (b.likeCount || 0) - (a.likeCount || 0)
                  } else if (sortBy === 'plays') {
                    return (b.playCount || 0) - (a.playCount || 0)
                  }
                  return 0
                }).map((track, index) => {
                  const isPlayingThisTrack = currentTrack?.id === track.id && isPlaying
                  const trackIndex = tracks.findIndex(t => t.id === track.id)
                  
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
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-600/20 to-purple-600/20">
                              <FontAwesomeIcon icon={faMusic} className="text-lg text-brand-400" />
                            </div>
                          )}
                          <div 
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover/track:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                            onClick={() => {
                              const sortedTracks = [...userTracks].sort((a, b) => {
                                if (sortBy === 'recent') {
                                  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                                } else if (sortBy === 'likes') {
                                  return (b.likeCount || 0) - (a.likeCount || 0)
                                } else if (sortBy === 'plays') {
                                  return (b.playCount || 0) - (a.playCount || 0)
                                }
                                return 0
                              })
                              
                              if (trackIndex >= 0) {
                                playTrack(tracks[trackIndex], trackIndex, sortedTracks)
                              } else {
                                playTrack(track, tracks.length, sortedTracks)
                              }
                            }}
                          >
                            <FontAwesomeIcon 
                              icon={isPlayingThisTrack ? faPause : faPlay} 
                              className="text-white text-sm" 
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Link 
                              href={`/track/${track.id}`}
                              className="text-white font-medium hover:text-brand-400 transition-colors truncate"
                            >
                              {track.title}
                            </Link>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Link 
                              href={track.artist?.uid ? `/u/${track.artist.uid}` : '#'}
                              className="text-neutral-400 text-sm hover:text-brand-400 transition-colors truncate"
                            >
                              {track.artist?.name || 'Unknown Artist'}
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="text-neutral-400 text-sm">
                        {track.duration ? formatDuration(track.duration) : '--'}
                      </div>

                      {/* Date */}
                      <div className="text-neutral-400 text-sm">
                        {track.createdAt ? formatRelativeTime(new Date(track.createdAt)) : '--'}
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
    </main>
  )
}

