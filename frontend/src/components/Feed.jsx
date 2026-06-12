import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { BASE_URL } from '../utils/constants'
import { useSelector } from 'react-redux'
import { useTheme } from '../utils/ThemeContext'
import { getImageUrl } from '../utils/imageUtils'

const Feed = () => {
  const { isDark, bg, text, card, button } = useTheme()
  const [users, setUsers] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [matchNotification, setMatchNotification] = useState(null)
  const [error, setError] = useState('')
  const currentUser = useSelector((state) => state.user)

  useEffect(() => {
    fetchFeed(1)
  }, [])

  // Refetch feed when user's interestedToConnectWith preference changes
  useEffect(() => {
    if (currentUser?.interestedToConnectWith !== undefined) {
      fetchFeed(1)
    }
  }, [currentUser?.interestedToConnectWith])

  // Helper function to calculate match reasons
  const getMatchReasons = (user) => {
    if (!currentUser || !user) return []
    const reasons = []
    
    // Check for same college
    if (currentUser.college && user.college && 
        currentUser.college.toLowerCase().trim() === user.college.toLowerCase().trim()) {
      reasons.push({ type: 'college', label: 'Same College', icon: '🎓' })
    }
    
    // Check for same course
    if (currentUser.course && user.course && 
        currentUser.course.toLowerCase().trim() === user.course.toLowerCase().trim()) {
      reasons.push({ type: 'course', label: 'Same Course', icon: '📚' })
    }
    
    // Check for common skills
    if (currentUser.skills && Array.isArray(currentUser.skills) && currentUser.skills.length > 0 &&
        user.skills && Array.isArray(user.skills) && user.skills.length > 0) {
      const currentSkills = currentUser.skills.map(s => s.toLowerCase().trim())
      const userSkills = user.skills.map(s => s.toLowerCase().trim())
      const commonSkills = currentSkills.filter(skill => userSkills.includes(skill))
      if (commonSkills.length > 0) {
        reasons.push({ 
          type: 'skills', 
          label: `${commonSkills.length} Common Skill${commonSkills.length > 1 ? 's' : ''}`, 
          icon: '💻' 
        })
      }
    }
    
    // Check for same branch
    if (currentUser.branch && user.branch && 
        currentUser.branch.toLowerCase().trim() === user.branch.toLowerCase().trim()) {
      reasons.push({ type: 'branch', label: 'Same Branch', icon: '🔧' })
    }
    
    return reasons
  }

  const fetchFeed = async (pageNum = page) => {
    try {
      setLoading(true)
      const res = await axios.get(BASE_URL + "/feed", {
        withCredentials: true,
        params: { page: pageNum, limit: 20 }
      })
      
      const newUsers = res.data.data || []
      
      if (pageNum === 1) {
        // First page - replace users
        setUsers(newUsers)
        setCurrentIndex(0)
      } else {
        // Subsequent pages - append users
        setUsers(prev => [...prev, ...newUsers])
      }
      
      // Check if there are more users
      setHasMore(newUsers.length === 20)
      setPage(pageNum)
    } catch (err) {
      console.error("Error fetching feed:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleSwipe = async (status) => {
    if (users.length === 0) return
    
    const currentUserCard = users[currentIndex]
    try {
      const response = await axios.post(
        `${BASE_URL}/request/send/${status}/${currentUserCard._id}`,
        {},
        { withCredentials: true }
      )
      
      // Check if it's a match (mutual interest)
      if (response.data.matched) {
        // Show match notification
        setMatchNotification({
          message: `🎉 It's a Match! You and ${currentUserCard.firstName} ${currentUserCard.lastName} are now connected!`,
          name: `${currentUserCard.firstName} ${currentUserCard.lastName}`
        })
        // Auto-hide after 5 seconds
        setTimeout(() => setMatchNotification(null), 5000)
      } else if (status === 'interested') {
        // Show that interest was sent
        console.log(`Interest shown in ${currentUserCard.firstName}`)
      }
      
      // Move to next user
      if (currentIndex < users.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        // Load more users if available
        if (hasMore) {
          await fetchFeed(page + 1)
          // After fetching, currentIndex will be at the last position
          // The new users are appended, so we stay at the same index
        } else {
          // No more users available
          setUsers([])
        }
      }
    } catch (err) {
      console.error("Error sending request:", err)
      // Show user-friendly error message
      const errorMessage = err.response?.data?.error || 'Failed to process request. Please try again.'
      setError(errorMessage)
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleMouseDown = (e) => {
    setDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e) => {
    if (!dragging) return
    const deltaX = e.clientX - dragStart.x
    const deltaY = e.clientY - dragStart.y
    setOffset({ x: deltaX, y: deltaY })
  }

  const handleMouseUp = () => {
    if (!dragging) return
    setDragging(false)
    
    // If swiped right enough, send interested
    if (offset.x > 100) {
      handleSwipe('interested')
    }
    // If swiped left enough, send ignore
    else if (offset.x < -100) {
      handleSwipe('ignore')
    }
    
    setOffset({ x: 0, y: 0 })
  }

  // Touch events for mobile
  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    setDragging(true)
    setDragStart({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchMove = (e) => {
    if (!dragging) return
    e.preventDefault() // Prevent scrolling
    const touch = e.touches[0]
    const deltaX = touch.clientX - dragStart.x
    const deltaY = touch.clientY - dragStart.y
    setOffset({ x: deltaX, y: deltaY })
  }

  const handleTouchEnd = () => {
    if (!dragging) return
    setDragging(false)
    
    // If swiped right enough, send interested
    if (offset.x > 100) {
      handleSwipe('interested')
    }
    // If swiped left enough, send ignore
    else if (offset.x < -100) {
      handleSwipe('ignore')
    }
    
    setOffset({ x: 0, y: 0 })
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${bg.primary}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-500 mx-auto"></div>
          <p className={`mt-4 ${text.secondary}`}>Loading developers...</p>
        </div>
      </div>
    )
  }

  if (!loading && users.length === 0) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${bg.primary}`}>
        <div className={`text-center p-8 ${card.bg} rounded-3xl ${card.shadow}`}>
          <div className="text-6xl mb-4">👨‍💻</div>
          <h2 className={`text-2xl font-bold ${text.primary} mb-2`}>No more developers!</h2>
          <p className={`${text.secondary} mb-4`}>Check back later for new connections</p>
          <button
            onClick={() => {
              setPage(1)
              setHasMore(true)
              fetchFeed(1)
            }}
            className={`px-6 py-3 ${button.primary} rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200`}
          >
            Refresh Feed
          </button>
        </div>
      </div>
    )
  }

  const currentCard = users[currentIndex]
  const rotation = offset.x * 0.1
  const opacity = 1 - Math.abs(offset.x) / 300

  return (
    <div 
      className={`min-h-screen ${bg.primary} py-8 px-4 transition-colors duration-300`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="max-w-md mx-auto">
        {/* Match Notification */}
        {matchNotification && (
          <div className={`mb-4 p-4 ${isDark ? 'bg-green-500/10' : 'bg-green-100'} border-l-4 border-green-500 ${isDark ? 'text-green-400' : 'text-green-700'} rounded-lg animate-pulse`}>
            <span className="font-medium">{matchNotification.message}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-4 ${isDark ? 'bg-red-500/10' : 'bg-red-100'} border-l-4 border-red-500 ${isDark ? 'text-red-400' : 'text-red-700'} rounded-lg animate-shake`}>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Discover Developers
          </h1>
          <p className={`${text.secondary} mt-2 text-sm sm:text-base`}>
            {currentUser?.interestedToConnectWith ? (
              <>
                Showing{' '}
                <span className="font-semibold text-pink-500 capitalize">
                  {currentUser.interestedToConnectWith === 'both' ? 'all genders' : currentUser.interestedToConnectWith}s
                </span>
                {' '}based on your preferences
              </>
            ) : (
              'Swipe right to connect, left to pass'
            )}
          </p>
          {currentUser?.interestedToConnectWith && (
            <p className={`${text.muted} mt-1 text-xs`}>
              Suggestions prioritized by college, skills, and course
            </p>
          )}
        </div>

        {/* Card Stack */}
        <div className="relative h-[500px] sm:h-[600px] mb-8">
          {/* Background Cards */}
          {users.slice(currentIndex, currentIndex + 3).map((user, idx) => {
            if (idx === 0) return null
            return (
              <div
                key={user._id}
                className={`absolute inset-0 ${card.bg} rounded-3xl ${card.shadow} transform`}
                style={{
                  transform: `scale(${1 - idx * 0.05}) translateY(${idx * 10}px)`,
                  zIndex: 10 - idx,
                  opacity: 0.7 - idx * 0.2
                }}
              >
                <div className="h-full rounded-3xl overflow-hidden">
                  <div className="h-2/3 bg-gradient-to-br from-pink-400 to-purple-500"></div>
                  <div className="h-1/3 p-6">
                    <h3 className={`text-xl font-bold ${text.primary}`}>{user.firstName} {user.lastName}</h3>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Main Card */}
          <div
            className={`absolute inset-0 ${card.bg} rounded-3xl shadow-2xl cursor-grab active:cursor-grabbing transition-transform touch-none select-none`}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg)`,
              opacity: opacity,
              zIndex: 20
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* Profile Image */}
            <div className="h-2/3 bg-gradient-to-br from-purple-400 via-pink-400 to-orange-400 rounded-t-3xl relative overflow-hidden">
              <img
                src={getImageUrl(currentCard?.photourl) || 'https://via.placeholder.com/400'}
                alt={currentCard?.firstName || 'User'}
                key={currentCard?.photourl} // Force re-render when photo changes
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/400'
                }}
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              
              {/* Name Badge */}
              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {currentCard.firstName} {currentCard.lastName}
                </h2>
                {currentCard.age && (
                  <p className="text-white/90 text-sm sm:text-base">{currentCard.age} years old</p>
                )}
                {/* Match Reasons Badge */}
                {getMatchReasons(currentCard).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {getMatchReasons(currentCard).slice(0, 2).map((reason, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full flex items-center gap-1"
                      >
                        <span>{reason.icon}</span>
                        <span>{reason.label}</span>
                      </span>
                    ))}
                    {getMatchReasons(currentCard).length > 2 && (
                      <span className="px-2 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                        +{getMatchReasons(currentCard).length - 2} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Card Content */}
            <div className="h-1/3 p-4 sm:p-6 overflow-y-auto">
              {/* About */}
              {currentCard.about && (
                <div className="mb-4">
                  <p className={`${text.secondary} text-sm leading-relaxed`}>{currentCard.about}</p>
                </div>
              )}

              {/* Skills */}
              {currentCard.skills && currentCard.skills.length > 0 && (
                <div className="mb-4">
                  <h3 className={`text-sm font-semibold ${text.muted} mb-2`}>Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {currentCard.skills.slice(0, 6).map((skill, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 ${isDark ? 'bg-pink-500/20 text-pink-400' : 'bg-gradient-to-r from-pink-100 to-purple-100 text-purple-700'} rounded-full text-xs font-medium`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Education and Gender */}
              {(currentCard.college || currentCard.course || currentCard.branch || currentCard.gender) && (
                <div className="space-y-2">
                  {/* Education */}
                  {(currentCard.college || currentCard.course || currentCard.branch) && (
                    <div className={`flex flex-col gap-1 text-sm ${text.secondary}`}>
                      {currentCard.college && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">🏫</span>
                          <span>{currentCard.college}</span>
                        </div>
                      )}
                      {(currentCard.course || currentCard.branch) && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">📚</span>
                          <span>{[currentCard.course, currentCard.branch].filter(Boolean).join(' - ')}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Gender */}
                  {currentCard.gender && (
                    <div className={`flex items-center gap-2 text-sm ${text.secondary}`}>
                      <span className="font-semibold">Gender:</span>
                      <span className="capitalize">{currentCard.gender}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 sm:gap-6">
          <button
            onClick={() => handleSwipe('ignore')}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} flex items-center justify-center shadow-lg transform hover:scale-110 transition-all active:scale-95`}
            aria-label="Pass"
          >
            <span className={`text-2xl sm:text-3xl ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>✕</span>
          </button>
          <button
            onClick={() => handleSwipe('interested')}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 flex items-center justify-center shadow-lg transform hover:scale-110 transition-all active:scale-95"
            aria-label="Like"
          >
            <span className="text-2xl sm:text-3xl text-white">♥</span>
          </button>
        </div>

        {/* Progress Indicator */}
        <div className={`mt-6 text-center text-sm ${text.secondary}`}>
          <p>
            {currentIndex + 1} of {users.length} developers
          </p>
          {hasMore && currentIndex >= users.length - 3 && (
            <p className="text-xs text-pink-500 mt-2">
              Loading more developers...
            </p>
          )}
          {!hasMore && currentIndex === users.length - 1 && (
            <p className={`text-xs ${text.muted} mt-2`}>
              You've seen all available developers
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Feed