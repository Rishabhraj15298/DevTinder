import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { BASE_URL } from '../utils/constants'
import { getSocket } from '../utils/socket'
import { formatMessageTime } from '../utils/messageUtils'
import { useTheme } from '../utils/ThemeContext'
import ThemeToggle from './ThemeToggle'
import ChatPanel from './ChatPanel'
import { getImageUrl } from '../utils/imageUtils'

const MessageHub = () => {
  const navigate = useNavigate()
  const { userId: urlUserId } = useParams()
  const currentUser = useSelector((state) => state.user)
  const [selectedUserId, setSelectedUserId] = useState(urlUserId || null)
  const { isDark, bg, text, border, button, card } = useTheme()
  const [conversations, setConversations] = useState([])
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('messages')
  const [searchQuery, setSearchQuery] = useState('')
  const socketRef = React.useRef(null)

  // Sync URL param with selected user
  useEffect(() => {
    if (urlUserId && urlUserId !== selectedUserId) {
      setSelectedUserId(urlUserId)
    }
  }, [urlUserId])

  useEffect(() => {
    if (!currentUser) {
      navigate('/login')
      return
    }
    fetchConversations()
    if (activeTab === 'matches') {
      fetchConnections()
    }
    setupSocketListeners()

    return () => {
      if (socketRef.current) {
        socketRef.current.off('message:new')
        socketRef.current.off('messages:read')
      }
    }
  }, [currentUser, activeTab])

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

  const fetchConnections = async () => {
    try {
      setMatchesLoading(true)
      const res = await axios.get(`${BASE_URL}/user/connections`, {
        withCredentials: true
      })
      setConnections(res.data.data || [])
    } catch (err) {
      console.error('Error fetching connections:', err)
      if (err.response?.status === 401) {
        navigate('/login')
      }
    } finally {
      setMatchesLoading(false)
    }
  }

  const setupSocketListeners = () => {
    const socket = getSocket()
    if (socket) {
      socketRef.current = socket
      
      socket.on('message:new', (message) => {
        const otherUserId = message.senderId?._id?.toString() || message.senderId?.toString()
        
        setConversations(prev => {
          const existingIndex = prev.findIndex(c => c._id?.toString() === otherUserId)
          
          if (existingIndex >= 0) {
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
            const [moved] = updated.splice(existingIndex, 1)
            return [moved, ...updated]
          } else {
            fetchConversations()
            return prev
          }
        })
      })

      socket.on('messages:read', () => {
        fetchConversations()
      })

      // Also listen for sent messages to update the list
      socket.on('message:sent', () => {
        fetchConversations()
      })
    }
  }

  const filteredConversations = conversations.filter(conv => {
    const fullName = `${conv.firstName} ${conv.lastName}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  const filteredConnections = connections.filter(conn => {
    const fullName = `${conn.firstName} ${conn.lastName}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  const getLastMessagePreview = (conversation) => {
    if (!conversation.lastMessage) return 'No messages yet'
    const content = conversation.lastMessage.content
    const isFromMe = conversation.lastMessage.senderId?.toString() !== conversation._id?.toString()
    return isFromMe ? `You: ${content}` : content
  }

  return (
    <div className={`flex h-screen ${bg.primary} transition-colors duration-300`}>
      {/* Left Sidebar - 1/4 width */}
      <div className={`w-1/4 ${bg.secondary} ${border.primary} border-r flex flex-col`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <img
                src={getImageUrl(currentUser?.photourl)}
                alt="You"
                className="w-10 h-10 rounded-full border-2 border-white"
                key={currentUser?.photourl}
              />
              <span className="text-white font-semibold">You</span>
            </div>
            <div className="flex items-center space-x-3">
              <ThemeToggle className="!bg-white/20 !text-white hover:!bg-white/30" />
              <button 
                onClick={() => navigate('/')}
                className="text-white hover:text-yellow-300 transition-colors p-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('matches')}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${
                activeTab === 'matches'
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Matches
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${
                activeTab === 'messages'
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Messages
            </button>
          </div>
        </div>

        {/* Search */}
        <div className={`p-3 ${bg.secondary}`}>
          <div className="relative">
            <input
              type="text"
              placeholder={activeTab === 'matches' ? 'Search matches' : 'Search messages'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${bg.tertiary} ${text.primary} placeholder-gray-400 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-pink-500`}
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'messages' ? (
            // Messages Tab
            loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className={`${text.muted} text-sm`}>
                  {searchQuery ? 'No conversations found' : 'No messages yet'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation._id}
                  onClick={() => {
                    setSelectedUserId(conversation._id)
                    window.history.pushState({}, '', `/messages/${conversation._id}`)
                  }}
                  className={`flex items-center p-4 cursor-pointer transition-colors ${border.primary} border-b ${
                    selectedUserId === conversation._id
                      ? bg.tertiary
                      : isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={getImageUrl(conversation.photourl)}
                      alt={`${conversation.firstName} ${conversation.lastName}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {conversation.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                      </div>
                    )}
                  </div>

                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold ${text.primary} text-sm truncate`}>
                        {conversation.firstName} {conversation.lastName}
                      </h3>
                      <span className={`text-xs ${text.muted} flex-shrink-0 ml-2`}>
                        {formatMessageTime(conversation.lastMessage?.createdAt)}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${
                      conversation.unreadCount > 0 ? `${text.primary} font-medium` : text.muted
                    }`}>
                      {getLastMessagePreview(conversation)}
                    </p>
                  </div>
                </div>
              ))
            )
          ) : (
            // Matches Tab
            matchesLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
              </div>
            ) : filteredConnections.length === 0 ? (
              <div className="text-center py-8 px-4">
                <p className={`${text.muted} text-sm`}>
                  {searchQuery ? 'No matches found' : 'No connections yet'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => navigate('/')}
                    className={`mt-4 px-4 py-2 ${button.primary} rounded-lg text-sm font-medium transition-all`}
                  >
                    Discover Developers
                  </button>
                )}
              </div>
            ) : (
              filteredConnections.map((connection) => (
                <div
                  key={connection._id}
                  className={`p-4 ${border.primary} border-b ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100'} transition-colors`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={getImageUrl(connection.photourl)}
                      alt={`${connection.firstName} ${connection.lastName}`}
                      className="w-12 h-12 rounded-full object-cover border-2 border-pink-500/30"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold ${text.primary} text-sm truncate`}>
                        {connection.firstName} {connection.lastName}
                      </h3>
                      {connection.age && (
                        <p className={`text-xs ${text.muted}`}>{connection.age} years old</p>
                      )}
                    </div>
                  </div>
                  
                  {connection.about && (
                    <p className={`text-xs ${text.secondary} mb-3 line-clamp-2`}>
                      {connection.about}
                    </p>
                  )}

                  {connection.skills && connection.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {connection.skills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-0.5 ${isDark ? 'bg-pink-500/20 text-pink-400' : 'bg-pink-100 text-pink-700'} rounded-full text-xs`}
                        >
                          {skill}
                        </span>
                      ))}
                      {connection.skills.length > 3 && (
                        <span className={`px-2 py-0.5 ${text.muted} text-xs`}>
                          +{connection.skills.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedUserId(connection._id)
                        setActiveTab('messages')
                        window.history.pushState({}, '', `/messages/${connection._id}`)
                        fetchConversations()
                      }}
                      className={`flex-1 px-3 py-2 ${button.primary} rounded-lg text-xs font-medium transition-all hover:shadow-lg`}
                    >
                      💬 Message
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/connections`)
                      }}
                      className={`flex-1 px-3 py-2 ${button.secondary} rounded-lg text-xs font-medium transition-all`}
                    >
                      👤 View
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Right Content - 3/4 width */}
      <div className={`flex-1 ${bg.primary}`}>
        {selectedUserId ? (
          <ChatPanel 
            userId={selectedUserId}
            otherUser={conversations.find(c => c._id === selectedUserId)}
            onBack={() => {
              setSelectedUserId(null)
              window.history.pushState({}, '', '/messages')
            }}
            onMessageSent={() => {
              fetchConversations()
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="relative inline-block mb-6">
                <div className={`w-24 h-24 ${bg.tertiary} rounded-full flex items-center justify-center`}>
                  <svg className={`w-12 h-12 ${text.muted}`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h2 className={`text-3xl font-bold ${text.primary} mb-3`}>Say Hello</h2>
              <p className={`${text.muted} max-w-md mx-auto px-4`}>
                Looking to strike up a conversation? When you match with others, you can send them a message under "Matches"
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageHub
