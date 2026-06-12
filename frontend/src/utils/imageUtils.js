import { BASE_URL } from './constants'

/**
 * Get full image URL from relative path or absolute URL
 * @param {string} imagePath - Image path (can be relative like /uploads/... or absolute URL)
 * @returns {string} Full image URL
 */
export const getImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/150'
  
  // If it's already a full URL (http/https), return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  
  // If it's a data URL (base64), return as-is
  if (imagePath.startsWith('data:image')) {
    return imagePath
  }
  
  // If it's a relative path (starts with /), prepend BASE_URL
  if (imagePath.startsWith('/')) {
    return `${BASE_URL}${imagePath}`
  }
  
  // Otherwise, return placeholder
  return 'https://via.placeholder.com/150'
}

