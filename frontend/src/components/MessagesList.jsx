import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { BASE_URL } from '../utils/constants'
import { getSocket } from '../utils/socket'
import { updateUnreadCountOnRead, formatMessageTime } from '../utils/messageUtils'

const MessagesList = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const socketRef = React.useRef(null)

  useEffect(() => {
    fetchConversations()
    setupSocketListeners()

    return () => {
      if (socketRef.current) {
        socketRef.current.off('message:new')
        socketRef.current.off('messages:read')
      }
    }
  }, [])

  // Refresh conversations when navigating back to this page
  useEffect(() => {
    if (location.pathname === '/messages') {
      fetchConversations()
    }
  }, [location.pathname])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${BASE_URL}/conversations`, {
        withCredentials: true
      })
      setConversations(res.data.data || [])
    } catch (err) {
      console.error('Error fetching conversations:', err)
      if (err.response?.status === 401) {
        navigate('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const setupSocketListeners = () => {
    const socket = getSocket()
    if (socket) {
      socketRef.current = socket
      
      // Listen for new messages to update the conversation list
      socket.on('message:new', (message) => {
        // message:new means someone sent a message TO the current user
        // So the senderId is the other user in the conversation
        const otherUserId = message.senderId?._id?.toString() || message.senderId?.toString()
        
        setConversations(prev => {
          const existingIndex = prev.findIndex(c => c._id?.toString() === otherUserId)
          
          if (existingIndex >= 0) {
            // Update existing conversation
            const updated = [...prev]
            updated[existingIndex] = {
              ...updated[existingIndex],
              lastMessage: {
                content: message.content,
                createdAt: message.createdAt,
                senderId: message.senderId
              },
              unreadCount: (updated[existingIndex].unreadCount || 0) + 1
            }
            // Move to top
            const [moved] = updated.splice(existingIndex, 1)
            return [moved, ...updated]
          } else {
            // New conversation - refresh the list to get full details
            fetchConversations()
            return prev
          }
        })
      })

      // Listen for when messages are read (to update unread count)
      socket.on('messages:read', (data) => {
        // When messages are read, refresh the conversations list
        // This ensures unread counts are accurate
        fetchConversations()
      })
    }
  }


  const getLastMessagePreview = (conversation) => {
    if (!conversation.lastMessage) return 'No messages yet'
    const isFromMe = conversation.lastMessage.senderId?._id?.toString() === conversation._id?.toString()
    return isFromMe ? `You: ${conversation.lastMessage.content}` : conversation.lastMessage.content
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Messages
            </h1>
            <button
              onClick={() => navigate('/connections')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              New Message
            </button>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {conversations.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">💬</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No messages yet</h2>
            <p className="text-gray-500 mb-6">Start a conversation with your connections!</p>
            <button
              onClick={() => navigate('/connections')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              Go to Connections
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation) => (
              <div
                key={conversation._id}
                onClick={() => navigate(`/messages/${conversation._id}`)}
                className="bg-white/80 backdrop-blur-lg rounded-xl p-4 cursor-pointer hover:bg-white transition-all duration-200 shadow-sm hover:shadow-md border border-gray-100 hover:border-purple-200 transform hover:scale-[1.01]"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={conversation.photourl || 'https://via.placeholder.com/60'}
                      alt={`${conversation.firstName} ${conversation.lastName}`}
                      className="w-14 h-14 rounded-full object-cover border-2 border-purple-200"
                    />
                    {conversation.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {conversation.firstName} {conversation.lastName}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatMessageTime(conversation.lastMessage?.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 truncate flex-grow">
                        {getLastMessagePreview(conversation)}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <div className="ml-2 flex-shrink-0">
                          <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MessagesList

