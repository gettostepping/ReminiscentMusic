export function getUserAvatar(imagePath?: string | null) {
  if (!imagePath) return '/UnknownUser1024.png'
  
  if (imagePath === '/placeholder.png') return '/UnknownUser1024.png'
  
  // If it's a Discord avatar URL, ensure we get the highest quality version
  if (imagePath.includes('cdn.discordapp.com/avatars')) {
    try {
      // Discord supports size parameter: ?size=1024 for highest quality
      // Remove any existing size parameter and add the highest quality one
      const url = new URL(imagePath)
      url.searchParams.set('size', '1024')
      return url.toString()
    } catch {
      // If URL parsing fails, just append size parameter
      const separator = imagePath.includes('?') ? '&' : '?'
      return `${imagePath}${separator}size=1024`
    }
  }
  
  // If it's a Discord banner URL, ensure high quality
  if (imagePath.includes('cdn.discordapp.com/banners')) {
    try {
      const url = new URL(imagePath)
      url.searchParams.set('size', '2048')
      return url.toString()
    } catch {
      // If URL parsing fails, just append size parameter
      const separator = imagePath.includes('?') ? '&' : '?'
      return `${imagePath}${separator}size=2048`
    }
  }
  
  return imagePath
}

export function getTrackArtwork(artworkUrl?: string | null) {
  if (!artworkUrl) return '/UnknownUser1024.png'
  
  // Trim whitespace
  artworkUrl = artworkUrl.trim()
  
  // If it's already a full URL (R2, Discord, etc.), return as-is
  if (artworkUrl.startsWith('http://') || artworkUrl.startsWith('https://')) {
    return artworkUrl
  }
  
  // Check if it's an R2 key (format: artwork/userId/file.jpg or audio/userId/file.mp3)
  // These should be converted to full URLs, but if stored as keys, we need to handle them
  if (artworkUrl.startsWith('artwork/') || artworkUrl.startsWith('audio/')) {
    // This is an R2 key - we need the public domain to construct the URL
    // For now, return placeholder since we can't construct R2 URLs on client side
    // The upload should always store full URLs, so this shouldn't happen
    console.warn('R2 key detected instead of full URL:', artworkUrl)
    return '/UnknownUser1024.png'
  }
  
  // If it's a legacy local path, return placeholder
  if (artworkUrl.startsWith('/uploads/')) {
    return '/UnknownUser1024.png'
  }
  
  // If it starts with a single slash but isn't /uploads/, it might be a malformed URL
  // Only return placeholder for known legacy paths
  if (artworkUrl.startsWith('/') && !artworkUrl.startsWith('//')) {
    // Double slash (//) might be a protocol-relative URL, which we should handle
    // For single slash, it's likely a local path that doesn't exist
    return '/UnknownUser1024.png'
  }
  
  // Protocol-relative URL (starts with //)
  if (artworkUrl.startsWith('//')) {
    // Prepend https: for protocol-relative URLs
    return `https:${artworkUrl}`
  }
  
  // Return as-is for any other format
  // This allows for URLs that might be stored without protocol (shouldn't happen, but handle gracefully)
  return artworkUrl
}

