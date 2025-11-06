"use client"
import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSoundcloud } from '@fortawesome/free-brands-svg-icons'
import { faXmark, faSpinner, faCheckCircle, faDownload } from '@fortawesome/free-solid-svg-icons'
import { useToast } from '@/hooks/useToast'

interface ImportSoundCloudLikesProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

export default function ImportSoundCloudLikes({ isOpen, onClose, onImportComplete }: ImportSoundCloudLikesProps) {
  const [username, setUsername] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [currentProgress, setCurrentProgress] = useState<{
    processed: number
    total: number
    imported: number
    skipped: number
    failed: number
  } | null>(null)
  const [importProgress, setImportProgress] = useState<{
    imported: number
    skipped: number
    failed: number
    total: number
    errors: string[]
    message?: string
  } | null>(null)
  const { showSuccess, showError } = useToast()

  if (!isOpen) return null

  const handleImport = async () => {
    if (!username.trim()) {
      showError('Please enter a SoundCloud username or URL')
      return
    }

    setIsImporting(true)
    setImportProgress(null)
    setCurrentProgress(null)

    try {
      const res = await fetch('/api/soundcloud/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      })

      if (!res.ok) {
        const errorData = await res.json()
        const errorMsg = errorData.error || errorData.details || 'Failed to import likes'
        throw new Error(errorMsg)
      }

      // Read streaming response
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.trim()) {
              try {
                const data = JSON.parse(line)
                
                // Handle progress updates
                if (data.type === 'progress') {
                  setCurrentProgress({
                    processed: data.processed || 0,
                    total: data.total || 0,
                    imported: data.imported || 0,
                    skipped: data.skipped || 0,
                    failed: data.failed || 0
                  })
                }
                
                // Handle final result
                if (data.type === 'complete') {
                  setImportProgress({
                    imported: data.imported || 0,
                    skipped: data.skipped || 0,
                    failed: data.failed || 0,
                    total: data.total || 0,
                    errors: data.errors || [],
                    message: data.message
                  })
                  setCurrentProgress(null)
                  
                  if (data.imported > 0) {
                    showSuccess(`Successfully imported ${data.imported} song${data.imported === 1 ? '' : 's'}!`)
                    onImportComplete()
                  } else {
                    showError(data.message || 'No songs were imported')
                  }
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            }
          }
        }
      } else {
        // Fallback to regular JSON response if streaming not supported
        const data = await res.json()
        setImportProgress({
          imported: data.imported || 0,
          skipped: data.skipped || 0,
          failed: data.failed || 0,
          total: data.total || 0,
          errors: data.errors || [],
          message: data.message
        })
        
        if (data.imported > 0) {
          showSuccess(`Successfully imported ${data.imported} song${data.imported === 1 ? '' : 's'}!`)
          onImportComplete()
        }
      }
    } catch (error: any) {
      console.error('Import error:', error)
      showError(error.message || 'Failed to import SoundCloud likes')
      setCurrentProgress(null)
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = () => {
    setUsername('')
    setImportProgress(null)
    setCurrentProgress(null)
    setIsImporting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faSoundcloud} className="text-orange-500 text-2xl" />
            <h2 className="text-2xl font-bold text-white">Import SoundCloud Likes</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xl" />
          </button>
        </div>

        {!importProgress && !currentProgress ? (
          <>
            <p className="text-neutral-400 mb-4">
              Enter your SoundCloud username or profile URL to import your liked songs.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                SoundCloud Username or URL
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username or https://soundcloud.com/username"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                disabled={isImporting}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isImporting) {
                    handleImport()
                  }
                }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={isImporting || !username.trim()}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isImporting ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faDownload} />
                    <span>Import Likes</span>
                  </>
                )}
              </button>
              <button
                onClick={handleClose}
                disabled={isImporting}
                className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        ) : currentProgress ? (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 text-orange-500 mb-4">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                <span className="font-semibold">Importing...</span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-neutral-400 text-sm">Processing tracks:</span>
                  <span className="text-white font-bold text-lg">
                    {currentProgress.processed} / {currentProgress.total}
                  </span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-orange-500 h-full transition-all duration-300 ease-out"
                    style={{ width: `${currentProgress.total > 0 ? (currentProgress.processed / currentProgress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-400">Imported:</span>
                  <span className="text-green-500 font-semibold">{currentProgress.imported}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Skipped:</span>
                  <span className="text-neutral-500 font-semibold">{currentProgress.skipped}</span>
                </div>
                {currentProgress.failed > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Failed:</span>
                    <span className="text-red-500 font-semibold">{currentProgress.failed}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 text-green-500 mb-4">
                <FontAwesomeIcon icon={faCheckCircle} />
                <span className="font-semibold">Import Complete!</span>
              </div>

              {importProgress && (
                <>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Total found:</span>
                      <span className="text-white font-semibold">{importProgress.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Imported:</span>
                      <span className="text-green-500 font-semibold">{importProgress.imported}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Skipped (already liked):</span>
                      <span className="text-neutral-500 font-semibold">{importProgress.skipped}</span>
                    </div>
                    {importProgress.failed > 0 && (
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Failed to process:</span>
                        <span className="text-red-500 font-semibold">{importProgress.failed}</span>
                      </div>
                    )}
                    {importProgress.message && (
                      <div className="mt-2 p-2 bg-blue-500/20 border border-blue-500/50 rounded text-xs text-blue-400">
                        ℹ️ {importProgress.message}
                      </div>
                    )}
                  </div>

                  {importProgress.errors.length > 0 && (
                    <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg">
                      <p className="text-xs text-neutral-400 mb-2">Some tracks could not be imported:</p>
                      <ul className="text-xs text-red-400 space-y-1">
                        {importProgress.errors.slice(0, 5).map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                        {importProgress.errors.length > 5 && (
                          <li className="text-neutral-500">...and {importProgress.errors.length - 5} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            <button
              onClick={handleClose}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}

