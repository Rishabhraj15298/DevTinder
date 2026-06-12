import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { BASE_URL } from '../utils/constants'
import { useTheme } from '../utils/ThemeContext'
import { getImageUrl } from '../utils/imageUtils'
import ConnectionMenu from './ConnectionMenu'
import ReportModal from './ReportModal'

const Connections = () => {
  const navigate = useNavigate()
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null)
  const [showBlockConfirm, setShowBlockConfirm] = useState(null)
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportingUserId, setReportingUserId] = useState(null)
  const [reportingUserName, setReportingUserName] = useState('')
  const { isDark, bg, text, border, card, button } = useTheme()

  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await axios.get(BASE_URL + "/user/connections", {
        withCredentials: true
      })
      setConnections(res.data.data || [])
    } catch (err) {
      console.error("Error fetching connections:", err)
      setError(err.response?.data?.error || 'Failed to fetch connections')
    } finally {
      setLoading(false)
    }
  }

  // Separate connections and blocked users
  const acceptedConnections = connections.filter(c => c.connectionStatus === 'accepted' || !c.connectionStatus)
  const blockedConnections = connections.filter(c => c.connectionStatus === 'blocked')

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${bg.primary}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-500 mx-auto"></div>
          <p className={`mt-4 ${text.secondary}`}>Loading connections...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${bg.primary} py-8 px-4 transition-colors duration-300`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            My Connections
          </h1>
          <p className={`${text.secondary} mt-2`}>Your matched developers and collaborators</p>
        </div>

        {/* Success Message */}
        {success && (
          <div className={`mb-4 p-4 ${isDark ? 'bg-green-500/10' : 'bg-green-100'} border-l-4 border-green-500 ${isDark ? 'text-green-400' : 'text-green-700'} rounded-lg`}>
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-4 ${isDark ? 'bg-red-500/10' : 'bg-red-100'} border-l-4 border-red-500 ${isDark ? 'text-red-400' : 'text-red-700'} rounded-lg animate-shake`}>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Accepted Connections Grid */}
        {acceptedConnections.length === 0 && blockedConnections.length === 0 ? (
          <div className={`text-center p-12 ${card.bg} rounded-3xl ${card.shadow}`}>
            <div className="text-6xl mb-4">🤝</div>
            <h2 className={`text-2xl font-bold ${text.primary} mb-2`}>No connections yet</h2>
            <p className={`${text.secondary} mb-4`}>Start swiping to find developers to connect with!</p>
            <a
              href="/"
              className={`inline-block px-6 py-3 ${button.primary} rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200`}
            >
              Discover Developers
            </a>
          </div>
        ) : (
          <>
            {/* Accepted Connections */}
            {acceptedConnections.length > 0 && (
              <div className="mb-8">
                <h2 className={`text-2xl font-bold ${text.primary} mb-4`}>Connections</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {acceptedConnections.map((connection) => (
                    <div
                      key={connection._id}
                      className={`${card.bg} rounded-2xl ${card.shadow} p-4 transform transition-all hover:scale-105 hover:shadow-xl relative`}
                    >
                      {/* 3-dot Menu */}
                      <div className="absolute top-2 right-2 z-10">
                        <ConnectionMenu
                          userId={connection._id}
                          onRemove={(userId) => setShowRemoveConfirm(userId)}
                          onBlock={(userId) => setShowBlockConfirm(userId)}
                          onReport={(userId) => {
                            setReportingUserId(userId)
                            setReportingUserName(`${connection.firstName} ${connection.lastName}`)
                            setShowReportModal(true)
                          }}
                          onUnblock={null}
                          isBlocked={false}
                          showReport={true}
                        />
                      </div>

                      {/* Circular Profile Photo */}
                      <div className="flex flex-col items-center mb-3">
                        <div className="relative mb-2">
                          <img
                            src={getImageUrl(connection.photourl)}
                            alt={`${connection.firstName} ${connection.lastName}`}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-pink-500"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/150'
                            }}
                          />
                          {/* Connected Badge */}
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </span>
                        </div>

                        {/* Name */}
                        <h3 className={`${text.primary} font-semibold text-sm text-center mb-1 line-clamp-1`}>
                          {connection.firstName} {connection.lastName}
                        </h3>
                        {connection.age && (
                          <p className={`${text.muted} text-xs mb-2`}>{connection.age} years</p>
                        )}
                      </div>

                      {/* Education - Compact */}
                      {(connection.college || connection.course || connection.branch) && (
                        <div className="mb-2">
                          <p className={`${text.muted} text-xs text-center line-clamp-1`}>
                            {connection.course && connection.branch 
                              ? `${connection.course} - ${connection.branch}`
                              : connection.course || connection.branch || connection.college
                            }
                          </p>
                          {connection.college && (connection.course || connection.branch) && (
                            <p className={`${text.muted} text-xs text-center line-clamp-1 mt-0.5`}>
                              {connection.college}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Skills - Compact */}
                      {connection.skills && connection.skills.length > 0 && (
                        <div className="mb-3">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {connection.skills.slice(0, 3).map((skill, idx) => (
                              <span
                                key={idx}
                                className={`px-1.5 py-0.5 ${isDark ? 'bg-pink-500/20 text-pink-400' : 'bg-pink-100 text-pink-700'} rounded-full text-xs font-medium`}
                              >
                                {skill}
                              </span>
                            ))}
                            {connection.skills.length > 3 && (
                              <span className={`px-1.5 py-0.5 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} rounded-full text-xs font-medium`}>
                                +{connection.skills.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 mt-auto">
                        <button
                          onClick={() => {
                            navigate(`/messages/${connection._id}`)
                          }}
                          className={`w-full px-3 py-1.5 ${button.primary} rounded-lg font-semibold text-xs hover:shadow-lg transform hover:scale-105 transition-all duration-200`}
                        >
                          Message
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Blocked Users Section */}
            {blockedConnections.length > 0 && (
              <div className="mt-8">
                <h2 className={`text-2xl font-bold ${text.primary} mb-4`}>Blocked Users</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {blockedConnections.map((connection) => (
                    <div
                      key={connection._id}
                      className={`${card.bg} rounded-2xl ${card.shadow} p-4 transform transition-all hover:scale-105 hover:shadow-xl relative opacity-75`}
                    >
                      {/* 3-dot Menu */}
                      <div className="absolute top-2 right-2 z-10">
                        <ConnectionMenu
                          userId={connection._id}
                          onRemove={null}
                          onBlock={null}
                          onReport={(userId) => {
                            setReportingUserId(userId)
                            setReportingUserName(`${connection.firstName} ${connection.lastName}`)
                            setShowReportModal(true)
                          }}
                          onUnblock={(userId) => setShowUnblockConfirm(userId)}
                          isBlocked={true}
                          showReport={true}
                        />
                      </div>

                      {/* Circular Profile Photo */}
                      <div className="flex flex-col items-center mb-3">
                        <div className="relative mb-2">
                          <img
                            src={getImageUrl(connection.photourl)}
                            alt={`${connection.firstName} ${connection.lastName}`}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-red-500 opacity-75"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/150'
                            }}
                          />
                          {/* Blocked Badge */}
                          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-white text-xs">🚫</span>
                          </span>
                        </div>

                        {/* Name */}
                        <h3 className={`${text.primary} font-semibold text-sm text-center mb-1 line-clamp-1`}>
                          {connection.firstName} {connection.lastName}
                        </h3>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => setShowUnblockConfirm(connection._id)}
                        className={`w-full px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-xs transition-all`}
                      >
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Connection Count */}
        {acceptedConnections.length > 0 && (
          <div className="mt-8 text-center">
            <p className={text.secondary}>
              You have <span className={`font-bold ${isDark ? 'text-pink-500' : 'text-purple-600'}`}>{acceptedConnections.length}</span> connection{acceptedConnections.length !== 1 ? 's' : ''}
              {blockedConnections.length > 0 && (
                <> and <span className={`font-bold ${isDark ? 'text-red-500' : 'text-red-600'}`}>{blockedConnections.length}</span> blocked user{blockedConnections.length !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>
        )}

        {/* Remove Connection Confirmation */}
        {showRemoveConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRemoveConfirm(null)}>
            <div className={`${bg.secondary} rounded-xl p-6 max-w-md mx-4 ${border.primary} border`} onClick={(e) => e.stopPropagation()}>
              <h3 className={`text-lg font-semibold ${text.primary} mb-2`}>Remove Connection?</h3>
              <p className={`${text.secondary} mb-4`}>This will remove this connection. You won't be able to message each other until you reconnect.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowRemoveConfirm(null)}
                  className={`px-4 py-2 ${button.secondary} rounded-lg font-medium`}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await axios.delete(`${BASE_URL}/connection/remove/${showRemoveConfirm}`, {
                        withCredentials: true
                      })
                      await fetchConnections()
                      setShowRemoveConfirm(null)
                      setSuccess('Connection removed successfully')
                      setError('')
                      setTimeout(() => setSuccess(''), 3000)
                    } catch (err) {
                      setError('Failed to remove connection: ' + (err.response?.data?.error || err.message))
                      setSuccess('')
                      setShowRemoveConfirm(null)
                      setTimeout(() => setError(''), 5000)
                    }
                  }}
                  className={`px-4 py-2 ${button.danger} rounded-lg font-medium`}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Block User Confirmation */}
        {showBlockConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBlockConfirm(null)}>
            <div className={`${bg.secondary} rounded-xl p-6 max-w-md mx-4 ${border.primary} border`} onClick={(e) => e.stopPropagation()}>
              <h3 className={`text-lg font-semibold ${text.primary} mb-2`}>Block User?</h3>
              <p className={`${text.secondary} mb-4`}>This will block this user. They won't be able to message you or see your profile. You can unblock them later.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowBlockConfirm(null)}
                  className={`px-4 py-2 ${button.secondary} rounded-lg font-medium`}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await axios.post(`${BASE_URL}/connection/block/${showBlockConfirm}`, {}, {
                        withCredentials: true
                      })
                      // Refresh connections list to update UI
                      await fetchConnections()
                      setShowBlockConfirm(null)
                      setSuccess('User blocked successfully')
                      setError('')
                      setTimeout(() => setSuccess(''), 3000)
                    } catch (err) {
                      setError('Failed to block user: ' + (err.response?.data?.error || err.message))
                      setSuccess('')
                      setShowBlockConfirm(null)
                      setTimeout(() => setError(''), 5000)
                    }
                  }}
                  className={`px-4 py-2 ${button.danger} rounded-lg font-medium`}
                >
                  Block
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unblock User Confirmation */}
        {showUnblockConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowUnblockConfirm(null)}>
            <div className={`${bg.secondary} rounded-xl p-6 max-w-md mx-4 ${border.primary} border`} onClick={(e) => e.stopPropagation()}>
              <h3 className={`text-lg font-semibold ${text.primary} mb-2`}>Unblock User?</h3>
              <p className={`${text.secondary} mb-4`}>This will unblock this user. They will be able to message you again if you're connected.</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowUnblockConfirm(null)}
                  className={`px-4 py-2 ${button.secondary} rounded-lg font-medium`}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const response = await axios.post(`${BASE_URL}/connection/unblock/${showUnblockConfirm}`, {}, {
                        withCredentials: true
                      })
                      
                      // Close modal first
                      setShowUnblockConfirm(null)
                      
                      // Refresh the connections list to show updated status
                      await fetchConnections()
                      
                      // Show success message
                      if (response.data.data?.restored) {
                        setSuccess('User unblocked successfully! Connection restored.')
                      } else {
                        setSuccess('User unblocked successfully!')
                      }
                      setError('')
                      setTimeout(() => setSuccess(''), 3000)
                    } catch (err) {
                      setError('Failed to unblock user: ' + (err.response?.data?.error || err.message))
                      setSuccess('')
                      setShowUnblockConfirm(null)
                      setTimeout(() => setError(''), 5000)
                    }
                  }}
                  className={`px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium`}
                >
                  Unblock
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Report Modal */}
        <ReportModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false)
            setReportingUserId(null)
            setReportingUserName('')
          }}
          reportedUserId={reportingUserId}
          reportedUserName={reportingUserName}
        />
      </div>
    </div>
  )
}

export default Connections

