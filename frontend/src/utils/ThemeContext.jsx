import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first, then system preference
    const saved = localStorage.getItem('devtinder-theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    localStorage.setItem('devtinder-theme', isDark ? 'dark' : 'light')
    // Update document class for global styles
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const toggleTheme = () => setIsDark(prev => !prev)

  // Theme colors - consistent throughout the app
  const theme = {
    isDark,
    toggleTheme,
    
    // Primary gradient (pink to purple - DevTinder brand)
    primary: 'from-pink-500 to-purple-600',
    primaryHover: 'from-pink-600 to-purple-700',
    
    // Accent colors
    accent: isDark ? 'pink-500' : 'purple-600',
    accentHover: isDark ? 'pink-400' : 'purple-500',
    
    // Background colors
    bg: {
      primary: isDark ? 'bg-gray-900' : 'bg-gray-50',
      secondary: isDark ? 'bg-gray-800' : 'bg-white',
      tertiary: isDark ? 'bg-gray-700' : 'bg-gray-100',
      card: isDark ? 'bg-gray-800/80' : 'bg-white/80',
      input: isDark ? 'bg-gray-700' : 'bg-white',
    },
    
    // Text colors
    text: {
      primary: isDark ? 'text-white' : 'text-gray-900',
      secondary: isDark ? 'text-gray-300' : 'text-gray-600',
      muted: isDark ? 'text-gray-400' : 'text-gray-500',
      inverse: isDark ? 'text-gray-900' : 'text-white',
    },
    
    // Border colors
    border: {
      primary: isDark ? 'border-gray-700' : 'border-gray-200',
      secondary: isDark ? 'border-gray-600' : 'border-gray-300',
      accent: isDark ? 'border-pink-500' : 'border-purple-500',
    },
    
    // Hover states
    hover: {
      bg: isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100',
      bgSubtle: isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50',
    },
    
    // Message bubbles
    message: {
      sent: 'bg-gradient-to-r from-pink-500 to-purple-600 text-white',
      received: isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-900',
    },
    
    // Cards
    card: {
      bg: isDark ? 'bg-gray-800' : 'bg-white',
      border: isDark ? 'border-gray-700' : 'border-gray-200',
      shadow: isDark ? 'shadow-xl shadow-black/20' : 'shadow-xl shadow-gray-200/50',
    },
    
    // Buttons
    button: {
      primary: 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white',
      secondary: isDark 
        ? 'bg-gray-700 hover:bg-gray-600 text-white border border-gray-600' 
        : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
      danger: 'bg-red-500 hover:bg-red-600 text-white',
      success: 'bg-green-500 hover:bg-green-600 text-white',
    },
  }

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeContext

