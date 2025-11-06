"use client"
import { motion, AnimatePresence } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

interface DownloadingPopupProps {
  isVisible: boolean
  trackTitle?: string
}

export default function DownloadingPopup({ isVisible, trackTitle }: DownloadingPopupProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-800 rounded-lg p-8 max-w-md w-full mx-4 shadow-xl border border-neutral-700"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <FontAwesomeIcon 
                    icon={faSpinner} 
                    className="text-4xl text-brand-400 animate-spin"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Downloading Song</h3>
                  {trackTitle && (
                    <p className="text-neutral-400 text-sm truncate max-w-xs">
                      {trackTitle}
                    </p>
                  )}
                  <p className="text-neutral-500 text-xs mt-2">
                    Please wait while we prepare the stream...
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

