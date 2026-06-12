import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { BASE_URL } from '../utils/constants'
import { useTheme } from '../utils/ThemeContext'
import { getImageUrl } from '../utils/imageUtils'

const Requests = () => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { isDark, bg, text, border, card, button } = useTheme()

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await axios.get(BASE_URL + "/requests/received", {
        withCredentials: true
      })
      setRequests(res.data.data || [])
    } catch (err) {
      console.error("Error fetching requests:", err)
      setError(err.response?.data?.error || 'Failed to fetch requests')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (status, requestId) => {
    try {
      setError('')
      setSuccess('')
      const res = await axios.post(
        `${BASE_URL}/request/review/${status}/${requestId}`,
        {},
        { withCredentials: true }
      )
      
      setSuccess(res.data.message || `Request ${status} successfully!`)
      // Remove the request from the list
      setRequests(prev => prev.filter(req => req._id !== requestId))
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      console.error("Error reviewing request:", err)
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to review request')
      setTimeout(() => setError(''), 5000)
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${bg.primary}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-500 mx-auto"></div>
          <p className={`mt-4 ${text.secondary}`}>Loading requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bg.primary} py-8 px-4 transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Connection Requests
          </h1>
          <p className={`${text.secondary} mt-2`}>Review and respond to connection requests</p>
        </div>

        {/* Messages */}
        {error && (
          <div className={`mb-4 p-4 ${isDark ? 'bg-red-500/10' : 'bg-red-100'} border-l-4 border-red-500 ${isDark ? 'text-red-400' : 'text-red-700'} rounded-lg animate-shake`}>
            <span className="font-medium">{error}</span>
          </div>
        )}
        {success && (
          <div className={`mb-4 p-4 ${isDark ? 'bg-green-500/10' : 'bg-green-100'} border-l-4 border-green-500 ${isDark ? 'text-green-400' : 'text-green-700'} rounded-lg`}>
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className={`text-center p-12 ${card.bg} rounded-3xl ${card.shadow}`}>
            <div className="text-6xl mb-4">📬</div>
            <h2 className={`text-2xl font-bold ${text.primary} mb-2`}>No pending requests</h2>
            <p className={text.secondary}>You don't have any connection requests at the moment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const user = request.fromUserId
              return (
                <div
                  key={request._id}
                  className={`${card.bg} rounded-3xl ${card.shadow} overflow-hidden transform transition-all hover:scale-105 hover:shadow-2xl`}
                >
                  <div className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row gap-6">
                      {/* Profile Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={getImageUrl(user?.photourl) || 'https://via.placeholder.com/150'}
                          alt={user?.firstName || 'User'}
                          key={user?.photourl} // Force re-render when photo changes
                          className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 ${isDark ? 'border-pink-500/30' : 'border-purple-200'}`}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/150'
                          }}
                        />
                      </div>

                      {/* User Info */}
                      <div className="flex-grow">
                        <h3 className={`text-2xl font-bold ${text.primary} mb-2`}>
                          {user?.firstName} {user?.lastName}
                        </h3>
                        
                        {user?.age && (
                          <p className={`${text.secondary} mb-2`}>{user?.age} years old</p>
                        )}
                        
                        {user?.about && (
                          <p className={`${text.secondary} mb-4 text-sm sm:text-base`}>{user?.about}</p>
                        )}

                        {/* Skills */}
                        {user?.skills && user.skills.length > 0 && (
                          <div className="mb-4">
                            <h4 className={`text-sm font-semibold ${text.muted} mb-2`}>Skills</h4>
                            <div className="flex flex-wrap gap-2">
                              {user.skills.slice(0, 5).map((skill, idx) => (
                                <span
                                  key={idx}
                                  className={`px-3 py-1 ${isDark ? 'bg-pink-500/20 text-pink-400' : 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700'} rounded-full text-xs font-medium`}
                                >
                                  {skill}
                                </span>
                              ))}
                              {user.skills.length > 5 && (
                                <span className={`px-3 py-1 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} rounded-full text-xs font-medium`}>
                                  +{user.skills.length - 5} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                          <button
                            onClick={() => handleReview('accepted', request._id)}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                          >
                            ✓ Accept
                          </button>
                          <button
                            onClick={() => handleReview('rejected', request._id)}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Requests

