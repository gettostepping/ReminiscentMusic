'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faMusic, 
  faSearch, 
  faUpload, 
  faUser, 
  faChevronDown,
  faSignOutAlt,
  faCog,
  faUserCircle,
  faShield,
  faHome,
  faHeart
} from '@fortawesome/free-solid-svg-icons'
import { getUserAvatar } from '@/lib/images'

interface AdminData {
  isOwner: boolean
  isDeveloper: boolean
  isAdmin: boolean
  isTrialMod: boolean
  roles: string[]
  uid: number
}

export default function Header() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [userUid, setUserUid] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [showNavText, setShowNavText] = useState(true)
  const [showSearchBar, setShowSearchBar] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
      // Don't close search bar if on explore page (it should always be visible)
      if (pathname !== '/explore' && searchInputRef.current && !searchInputRef.current.parentElement?.contains(event.target as Node) && 
          !(event.target as HTMLElement).closest('[data-explore-button]')) {
        setShowSearchBar(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [pathname])

  useEffect(() => {
    if (showSearchBar && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearchBar])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/explore?search=${encodeURIComponent(searchQuery)}`)
      // Keep search bar open on explore page, don't clear query
    } else {
      router.push('/explore')
      // Keep search bar open on explore page
    }
  }

  const handleExploreClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // Only toggle the search bar, don't redirect
    if (pathname === '/explore') {
      // On explore page, search bar is always visible, so just focus it
      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }
    } else {
      // On other pages, toggle the search bar
      setShowSearchBar(!showSearchBar)
    }
  }

  // Auto-open search bar when on explore page and keep it always visible
  useEffect(() => {
    if (pathname === '/explore') {
      setShowSearchBar(true)
    } else {
      setShowSearchBar(false)
      setSearchQuery('')
    }
  }, [pathname])

  const hasFetchedProfileRef = useRef(false)
  const hasFetchedAdminRef = useRef(false)

  useEffect(() => {
    if (session?.user?.email && !hasFetchedProfileRef.current) {
      hasFetchedProfileRef.current = true
      fetch('/api/profiles?email=' + encodeURIComponent(session.user.email))
        .then(res => res.json())
        .then(data => {
          if (data.user?.uid) setUserUid(data.user.uid.toString())
        })
        .catch(() => {})
        .finally(() => {
          // Reset after a delay to allow re-fetch if session changes
          setTimeout(() => { hasFetchedProfileRef.current = false }, 1000)
        })
    } else if (!session?.user?.email) {
      hasFetchedProfileRef.current = false
    }
  }, [session?.user?.email])

  useEffect(() => {
    if (!session) {
      setAdminData(null)
      hasFetchedAdminRef.current = false
      return
    }
    
    if (hasFetchedAdminRef.current) return
    hasFetchedAdminRef.current = true
    
    async function fetchAdminStatus() {
      try {
        const res = await fetch('/api/admin/check')
        if (res.ok) {
          const data = await res.json()
          setAdminData(data)
        }
      } catch (error) {
        console.error('Failed to fetch admin status:', error)
      } finally {
        // Reset after a delay to allow re-fetch if session changes
        setTimeout(() => { hasFetchedAdminRef.current = false }, 1000)
      }
    }
    fetchAdminStatus()
  }, [session?.user?.email])

  useEffect(() => {
    const header = headerRef.current
    const nav = navRef.current
    if (!header || !nav) return

    const checkSpace = () => {
      const headerWidth = header.offsetWidth
      const navWidth = nav.scrollWidth
      const availableWidth = headerWidth - 300
      
      setShowNavText(navWidth <= availableWidth)
    }

    checkSpace()
    
    const resizeObserver = new ResizeObserver(checkSpace)
    resizeObserver.observe(header)
    resizeObserver.observe(nav)
    
    window.addEventListener('resize', checkSpace)
    
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', checkSpace)
    }
  }, [])

  const adminCheck = adminData && (adminData.isAdmin || adminData.isDeveloper || adminData.isOwner || adminData.isTrialMod)

  return (
    <header className="sticky top-0 z-30 bg-neutral-900/70 backdrop-blur border-b border-neutral-800 min-h-[80px]">
      <div ref={headerRef} className="max-w-6xl mx-auto p-4 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link href="/" className="group/logo flex items-center gap-3 px-4 py-3 rounded-xl flex-shrink-0 transition-all duration-300 hover:scale-105">
          <FontAwesomeIcon 
            icon={faMusic} 
            className="text-2xl text-brand-400 transition-all duration-300 group-hover/logo:rotate-12 group-hover/logo:scale-110" 
          />
          <span className="text-2xl font-black text-brand-400 transition-all duration-300 group-hover/logo:text-brand-300">Reminiscent</span>
        </Link>

        {/* Navigation */}
        <nav ref={navRef} className="flex items-center gap-1 md:gap-2 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
          <Link href="/" className={`group/nav flex items-center gap-2 px-2 md:px-3 lg:px-4 py-2 rounded-lg transition-all duration-300 flex-shrink-0 whitespace-nowrap ${pathname === '/' ? 'bg-brand-600 text-white scale-105' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50 hover:scale-105'}`}>
            <FontAwesomeIcon icon={faHome} className="w-4 h-4 transition-transform duration-300 group-hover/nav:scale-110" />
            {showNavText && <span className="transition-all duration-300">Home</span>}
          </Link>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleExploreClick}
              data-explore-button
              className={`group/nav flex items-center gap-2 px-2 md:px-3 lg:px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${pathname === '/explore' ? 'bg-brand-600 text-white scale-105' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50 hover:scale-105'}`}
            >
              <FontAwesomeIcon icon={faSearch} className="w-4 h-4 transition-transform duration-300 group-hover/nav:scale-110" />
              {showNavText && <span className="transition-all duration-300">Explore</span>}
            </button>

            {/* Animated Search Bar */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                showSearchBar
                  ? 'max-w-[280px] md:max-w-[350px] opacity-100 ml-2'
                  : 'max-w-0 opacity-0 ml-0'
              }`}
            >
              <form onSubmit={handleSearchSubmit} className="flex items-center h-full">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tracks, artists..."
                  className="bg-neutral-800/90 backdrop-blur-sm border border-neutral-700 rounded-lg px-4 py-2 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm w-full min-w-[200px] transition-all duration-300"
                  onBlur={(e) => {
                    // Don't close if on explore page or clicking on the form itself or the explore button
                    if (pathname !== '/explore' && !e.currentTarget.parentElement?.contains(e.relatedTarget as Node) &&
                        !(e.relatedTarget as HTMLElement)?.closest('[data-explore-button]')) {
                      setTimeout(() => {
                        if (!searchQuery.trim()) {
                          setShowSearchBar(false)
                        }
                      }, 200)
                    }
                  }}
                />
              </form>
            </div>
          </div>

          {session && (
            <>
              <Link href="/upload" className={`group/nav flex items-center gap-2 px-2 md:px-3 lg:px-4 py-2 rounded-lg transition-all duration-300 flex-shrink-0 whitespace-nowrap ${pathname === '/upload' ? 'bg-brand-600 text-white scale-105' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50 hover:scale-105'}`}>
                <FontAwesomeIcon icon={faUpload} className="w-4 h-4 transition-transform duration-300 group-hover/nav:scale-110 group-hover/nav:translate-y-[-2px]" />
                {showNavText && <span className="transition-all duration-300">Upload</span>}
              </Link>

              <Link href="/library" className={`group/nav flex items-center gap-2 px-2 md:px-3 lg:px-4 py-2 rounded-lg transition-all duration-300 flex-shrink-0 whitespace-nowrap ${pathname === '/library' ? 'bg-brand-600 text-white scale-105' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50 hover:scale-105'}`}>
                <FontAwesomeIcon icon={faHeart} className="w-4 h-4 transition-transform duration-300 group-hover/nav:scale-110 group-hover/nav:text-red-400" />
                {showNavText && <span className="transition-all duration-300">Library</span>}
              </Link>
            </>
          )}
        </nav>

        {/* User Profile / Sign In */}
        {status === 'loading' ? (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700/50 animate-pulse flex-shrink-0 min-w-[120px]">
            <div className="w-8 h-8 bg-neutral-700 rounded-full"></div>
            <div className="w-20 h-4 bg-neutral-700 rounded"></div>
          </div>
        ) : status === 'authenticated' ? (
          <div className="relative flex-shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`group/profile flex items-center gap-2 md:gap-3 px-2 md:px-3 py-2 rounded-lg bg-neutral-800/50 hover:bg-neutral-700/50 transition-all duration-300 whitespace-nowrap hover:scale-105 ${showNavText ? 'min-w-[120px]' : ''}`}
            >
              <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0 transition-transform duration-300 group-hover/profile:ring-2 group-hover/profile:ring-brand-400/50">
                <Image src={getUserAvatar(session.user?.image)} alt={session.user?.name || ''} width={64} height={64} quality={95} className="object-cover w-full h-full transition-transform duration-300 group-hover/profile:scale-110" />
              </div>
              {showNavText && <span className="text-white font-medium truncate transition-all duration-300">{session.user?.name}</span>}
              <FontAwesomeIcon icon={faChevronDown} className={`text-neutral-400 transition-all duration-300 flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''} group-hover/profile:text-brand-400`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-neutral-900/95 backdrop-blur-sm border border-neutral-700/50 rounded-xl shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out]">
                <div className="p-4 border-b border-neutral-800/50 flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden">
                    <Image src={getUserAvatar(session.user?.image)} alt={session.user?.name || ''} width={96} height={96} quality={95} className="object-cover w-full h-full" />
                  </div>
                  <div>
                    <div className="text-white font-medium truncate">{session.user?.name}</div>
                    <div className="text-sm text-neutral-400 truncate">{session.user?.email}</div>
                  </div>
                </div>

                <div className="py-2">
                  <Link href={userUid ? `/u/${userUid}` : '#'} className="group/dropdown flex items-center gap-3 px-4 py-3 text-white hover:bg-neutral-800/50 transition-all duration-200 hover:translate-x-1" onClick={() => setDropdownOpen(false)}>
                    <FontAwesomeIcon icon={faUserCircle} className="w-4 h-4 transition-transform duration-200 group-hover/dropdown:scale-110" /> My Profile
                  </Link>

                  <Link href="/settings" className="group/dropdown flex items-center gap-3 px-4 py-3 text-white hover:bg-neutral-800/50 transition-all duration-200 hover:translate-x-1" onClick={() => setDropdownOpen(false)}>
                    <FontAwesomeIcon icon={faCog} className="w-4 h-4 transition-transform duration-200 group-hover/dropdown:rotate-90" /> Settings
                  </Link>

                  {adminCheck && (
                    <Link href="/admin" className="group/dropdown flex items-center gap-3 px-4 py-3 text-white hover:bg-neutral-800/50 transition-all duration-200 hover:translate-x-1" onClick={() => setDropdownOpen(false)}>
                      <FontAwesomeIcon icon={faShield} className="w-4 h-4 transition-transform duration-200 group-hover/dropdown:scale-110" /> Admin Panel
                    </Link>
                  )}

                  <button onClick={() => { setDropdownOpen(false); signOut() }} className="group/dropdown flex items-center gap-3 px-4 py-3 text-white hover:bg-red-900/30 transition-all duration-200 hover:translate-x-1 w-full text-left">
                    <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4 transition-transform duration-200 group-hover/dropdown:scale-110" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link href="/auth/signin" className="group/signin flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-brand-600/50">
            <FontAwesomeIcon icon={faUser} className="w-4 h-4 transition-transform duration-300 group-hover/signin:scale-110" /> Sign In
          </Link>
        )}
      </div>
    </header>
  )
}

