import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '../utils/ThemeContext'

const ConnectionMenu = ({ userId, onRemove, onBlock, onUnblock, onDeleteChat, onReport, isBlocked, showDeleteChat = false, showReport = true }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const { isDark, bg, text, border } = useTheme()

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      {/* 3-dot menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-full ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
        title="More options"
      >
        <svg className={`w-5 h-5 ${text.muted}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute right-0 mt-2 w-48 ${bg.secondary} rounded-lg ${border.primary} border shadow-xl z-50 py-2`}>
          {isBlocked ? (
            <button
              onClick={() => {
                onUnblock(userId)
                setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-2 text-sm ${text.secondary} hover:bg-gray-700/50 transition-colors`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                </svg>
                <span>Unblock</span>
              </div>
            </button>
          ) : (
            <>
              {showDeleteChat && onDeleteChat && (
                <>
                  <button
                    onClick={() => {
                      onDeleteChat(userId)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${text.secondary} hover:bg-gray-700/50 transition-colors`}
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Delete Chat</span>
                    </div>
                  </button>
                  <div className={`${border.primary} border-t my-1`}></div>
                </>
              )}
              <button
                onClick={() => {
                  onRemove(userId)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-2 text-sm ${text.secondary} hover:bg-gray-700/50 transition-colors`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Remove Connection</span>
                </div>
              </button>
              <div className={`${border.primary} border-t my-1`}></div>
              <button
                onClick={() => {
                  onBlock(userId)
                  setIsOpen(false)
                }}
                className={`w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span>Block</span>
                </div>
              </button>
              {showReport && onReport && (
                <>
                  <div className={`${border.primary} border-t my-1`}></div>
                  <button
                    onClick={() => {
                      onReport(userId)
                      setIsOpen(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm ${text.secondary} hover:bg-gray-700/50 transition-colors`}
                  >
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Report</span>
                    </div>
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ConnectionMenu

