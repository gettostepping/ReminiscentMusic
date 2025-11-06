"use client"
import { useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faMusic, faSpinner, faImage } from '@fortawesome/free-solid-svg-icons'
import NotSignedIn from '@/components/NotSignedIn'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/Toast'

export default function UploadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { showSuccess, showError, toasts, removeToast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const genres = [
    '',
    'Beat',
    'Hip-Hop',
    'Rap',
    'R&B',
    'Pop',
    'Rock',
    'Electronic',
    'EDM',
    'House',
    'Techno',
    'Trance',
    'Dubstep',
    'Drum & Bass',
    'Trap',
    'Lo-Fi',
    'Jazz',
    'Blues',
    'Country',
    'Folk',
    'Indie',
    'Alternative',
    'Metal',
    'Punk',
    'Reggae',
    'Latin',
    'Classical',
    'Ambient',
    'Experimental',
    'Acoustic',
    'Soul',
    'Funk',
    'Disco',
    'Synthwave',
    'Vaporwave',
    'Chillout',
    'Progressive',
    'Hardcore',
    'Garage',
    'Bass',
    'Dark',
    'Minimal',
    'Deep House',
    'Tech House',
    'Big Room',
    'Future Bass',
    'Melodic',
    'Hardstyle',
    'Psytrance',
    'Downtempo',
    'Breaks'
  ]
  
  const [genre, setGenre] = useState('')
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [artworkFile, setArtworkFile] = useState<File | null>(null)
  const [audioPreview, setAudioPreview] = useState<string | null>(null)
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const artworkInputRef = useRef<HTMLInputElement>(null)

  if (status === "unauthenticated") {
    return <NotSignedIn />
  }

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioFile(file)
        const url = URL.createObjectURL(file)
        setAudioPreview(url)
      } else {
        showError('Please select an audio file')
      }
    }
  }

  const handleArtworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) {
        setArtworkFile(file)
        const url = URL.createObjectURL(file)
        setArtworkPreview(url)
      } else {
        showError('Please select an image file')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      showError('Title is required')
      return
    }

    if (!audioFile) {
      showError('Audio file is required')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('genre', genre)
      formData.append('audio', audioFile)
      if (artworkFile) {
        formData.append('artwork', artworkFile)
      }

      const response = await fetch('/api/tracks', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        showSuccess('Track uploaded successfully!')
        router.push(`/track/${data.track.id}`)
      } else {
        const error = await response.json()
        showError(error.error || 'Failed to upload track')
      }
    } catch (error) {
      console.error('Upload error:', error)
      showError('Failed to upload track')
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
      <div className="max-w-4xl mx-auto px-6 py-8 pb-32">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <FontAwesomeIcon icon={faUpload} className="text-brand-400" />
            Upload Track
          </h1>
          <p className="text-neutral-400">Share your music with the world</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-white font-medium mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-neutral-800/80 backdrop-blur-sm border border-neutral-700/60 rounded-lg px-4 py-3 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner"
              placeholder="Enter track title"
              required
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Tell us about your track..."
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Genre</label>
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-neutral-800/80 backdrop-blur-sm border border-neutral-700/60 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-inner appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a3a3a3' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 1rem center',
                paddingRight: '2.5rem'
              }}
            >
              {genres.map((g) => (
                <option key={g || 'none'} value={g} className="bg-neutral-800 text-white">
                  {g || 'No Genre'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Audio File *</label>
            <div className="border-2 border-dashed border-neutral-700 rounded-lg p-8 text-center hover:border-brand-600 transition-colors">
              {audioPreview ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <FontAwesomeIcon icon={faMusic} className="text-4xl text-brand-400" />
                  </div>
                  <p className="text-white">{audioFile?.name}</p>
                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    Change file
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <FontAwesomeIcon icon={faUpload} className="text-4xl text-neutral-400" />
                  <div>
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      className="text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      Click to upload
                    </button>
                    <p className="text-neutral-400 text-sm mt-2">or drag and drop</p>
                    <p className="text-neutral-500 text-xs mt-1">MP3, WAV, OGG, etc.</p>
                  </div>
                </div>
              )}
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioChange}
                className="hidden"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Artwork (Optional)</label>
            <div className="border-2 border-dashed border-neutral-700 rounded-lg p-8 text-center hover:border-brand-600 transition-colors">
              {artworkPreview ? (
                <div className="space-y-4">
                  <img src={artworkPreview} alt="Artwork preview" className="max-w-xs mx-auto rounded-lg" />
                  <button
                    type="button"
                    onClick={() => artworkInputRef.current?.click()}
                    className="text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    Change image
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <FontAwesomeIcon icon={faImage} className="text-4xl text-neutral-400" />
                  <div>
                    <button
                      type="button"
                      onClick={() => artworkInputRef.current?.click()}
                      className="text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      Click to upload
                    </button>
                    <p className="text-neutral-400 text-sm mt-2">or drag and drop</p>
                    <p className="text-neutral-500 text-xs mt-1">JPG, PNG, etc.</p>
                  </div>
                </div>
              )}
              <input
                ref={artworkInputRef}
                type="file"
                accept="image/*"
                onChange={handleArtworkChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faUpload} />
                  Upload Track
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </main>
  )
}

