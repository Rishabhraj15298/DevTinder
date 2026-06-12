import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { BASE_URL } from '../utils/constants'
import { getSocket } from '../utils/socket'
import { markMessagesAsRead } from '../utils/messageUtils'
import { useTheme } from '../utils/ThemeContext'
import { getImageUrl } from '../utils/imageUtils'
import ConnectionMenu from './ConnectionMenu'
import ReportModal from './ReportModal'

const ChatPanel = ({ userId, otherUser: initialOtherUser, onBack, onMessageSent }) => {
  const { isDark, bg, text, border, message, button } = useTheme()
  const currentUser = useSelector((state) => state.user)
  const [otherUser, setOtherUser] = useState(initialOtherUser || null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [deletingMessageId, setDeletingMessageId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showDeleteConversationConfirm, setShowDeleteConversationConfirm] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [showUnblockConfirm, setShowUnblockConfirm] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const messageMenuRef = useRef({})

  // Update otherUser when initialOtherUser prop changes (from MessageHub)
  useEffect(() => {
    if (initialOtherUser && initialOtherUser._id === userId) {
      setOtherUser(initialOtherUser)
    }
  }, [initialOtherUser, userId])

  useEffect(() => {
    if (!userId || !currentUser) return

    initializeSocketConnection()
    fetchUserAndMessages()

    return () => {
      if (socketRef.current) {
        socketRef.current.off('message:new')
        socketRef.current.off('message:sent')
        socketRef.current.off('message:error')
        socketRef.current.off('typing:start')
        socketRef.current.off('typing:stop')
        socketRef.current.off('message:deleted')
        socketRef.current.off('message:delete:error')
        socketRef.current.off('conversation:deleted')
        socketRef.current.off('conversation:delete:error')
        socketRef.current.off('connection:removed')
        socketRef.current.off('connection:remove:error')
        socketRef.current.off('connection:blocked')
        socketRef.current.off('connection:block:error')
        socketRef.current.off('connection:unblocked')
        socketRef.current.off('connection:unblock:error')
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [userId, currentUser])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initializeSocketConnection = () => {
    try {
      socketRef.current = getSocket()
      
      if (!socketRef.current) {
        console.error('Failed to get socket instance')
        return
      }

      const onConnect = () => {
        setSocketConnected(true)
        setupSocketListeners()
      }

      const onDisconnect = () => {
        setSocketConnected(false)
      }

      socketRef.current.off('connect', onConnect)
      socketRef.current.off('disconnect', onDisconnect)
      socketRef.current.on('connect', onConnect)
      socketRef.current.on('disconnect', onDisconnect)

      if (socketRef.current.connected) {
        onConnect()
      } else {
        socketRef.current.connect()
      }
    } catch (err) {
      console.error('Error initializing socket:', err)
      setSocketConnected(false)
    }
  }

  const fetchUserAndMessages = async () => {
    try {
      setLoading(true)
      
      // Fetch updated user data from connections
      const userRes = await axios.get(`${BASE_URL}/user/connections`, {
        withCredentials: true
      })
      const user = userRes.data.data.find(u => u._id === userId)
      
      if (!user) {
        onBack?.()
        return
      }
      
      setOtherUser(user)

      const messagesRes = await axios.get(
        `${BASE_URL}/conversation/${userId}`,
        { withCredentials: true }
      )
      setMessages(messagesRes.data.data || [])
      
      markMessagesAsRead(userId, getSocket)
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }

  // Refetch user data periodically to get updated profile photos
  useEffect(() => {
    if (!userId) return

    const refreshUserData = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/user/connections`, {
          withCredentials: true
        })
        const user = res.data.data.find(u => u._id === userId)
        if (user) {
          setOtherUser(prev => {
            // Only update if data actually changed
            if (!prev || prev.photourl !== user.photourl || prev.firstName !== user.firstName) {
              return user
            }
            return prev
          })
        }
      } catch (err) {
        console.error('Error refreshing user data:', err)
      }
    }

    // Refresh immediately when userId changes
    refreshUserData()

    // Set up periodic refresh (every 30 seconds) to catch profile updates
    const refreshInterval = setInterval(refreshUserData, 30000)

    return () => clearInterval(refreshInterval)
  }, [userId])

  const setupSocketListeners = () => {
    const socket = socketRef.current
    if (!socket || !socket.connected) return

    socket.off('message:new')
    socket.off('message:sent')
    socket.off('message:error')
    socket.off('typing:start')
    socket.off('typing:stop')

    socket.on('message:new', (message) => {
      const senderId = message.senderId?._id || message.senderId
      const senderIdStr = senderId?.toString() || senderId
      const userIdStr = userId?.toString() || userId
      
      if (senderIdStr === userIdStr) {
        setMessages(prev => [...prev, message])
        setIsTyping(false)
        markMessagesAsRead(userId, getSocket)
      }
    })

    socket.on('message:sent', (message) => {
      const senderId = message.senderId?._id || message.senderId
      const senderIdStr = senderId?.toString() || senderId
      const currentUserIdStr = currentUser._id?.toString() || currentUser._id
      
      if (senderIdStr === currentUserIdStr) {
        setMessages(prev => {
          const exists = prev.find(m => m._id === message._id)
          if (exists) return prev
          return [...prev, message]
        })
        setSending(false)
        onMessageSent?.()
      }
    })

    socket.on('message:error', (data) => {
      console.error('Message error:', data.error)
      setSending(false)
      alert(data.error)
    })

    socket.on('typing:start', (data) => {
      if (data.senderId === userId) {
        setIsTyping(true)
      }
    })

    socket.on('typing:stop', (data) => {
      if (data.senderId === userId) {
        setIsTyping(false)
      }
    })

    // Listen for message delete events
    socket.on('message:deleted', (data) => {
      setMessages(prev => prev.filter(msg => msg._id !== data.messageId))
      if (onMessageSent) {
        onMessageSent() // Refresh conversations
      }
    })

    socket.on('message:delete:error', (data) => {
      alert('Error deleting message: ' + data.error)
      setDeletingMessageId(null)
    })

    // Listen for conversation delete events
    socket.on('conversation:deleted', (data) => {
      setMessages([])
      if (onBack) {
        onBack()
      }
    })

    socket.on('conversation:delete:error', (data) => {
      alert('Error deleting conversation: ' + data.error)
      setShowDeleteConversationConfirm(false)
    })

    // Listen for connection management events
    socket.on('connection:removed', (data) => {
      setMessages([])
      if (onMessageSent) {
        onMessageSent()
      }
      if (onBack) {
        onBack()
      }
    })

    socket.on('connection:remove:error', (data) => {
      alert('Error removing connection: ' + data.error)
      setShowRemoveConfirm(false)
    })

    socket.on('connection:blocked', (data) => {
      setIsBlocked(true)
      setMessages([])
      if (onMessageSent) {
        onMessageSent()
      }
      if (onBack) {
        onBack()
      }
    })

    socket.on('connection:block:error', (data) => {
      alert('Error blocking user: ' + data.error)
      setShowBlockConfirm(false)
    })

    socket.on('connection:unblocked', (data) => {
      setIsBlocked(false)
      if (data.restored) {
        // If connection was restored, fetch user and messages again
        fetchUserAndMessages()
      }
      if (onMessageSent) {
        onMessageSent()
      }
    })

    socket.on('connection:unblock:error', (data) => {
      alert('Error unblocking user: ' + data.error)
      setShowUnblockConfirm(false)
    })
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    const socket = socketRef.current
    if (!socket || !socket.connected) {
      alert('Not connected. Please wait...')
      return
    }

    setSending(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

    socket.emit('typing:stop', { receiverId: userId })
    socket.emit('message:send', {
      receiverId: userId,
      content: messageContent,
    })

    setTimeout(() => {
      if (sending) setSending(false)
    }, 5000)
  }

  const handleTyping = (e) => {
    setNewMessage(e.target.value)
    
    const socket = socketRef.current
    if (!socket?.connected) return

    socket.emit('typing:start', { receiverId: userId })

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', { receiverId: userId })
    }, 1000)
  }

  const formatTime = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const handleDeleteMessage = async (messageId) => {
    try {
      setDeletingMessageId(messageId)
      const socket = socketRef.current

      if (socket && socket.connected) {
        socket.emit('message:delete', { messageId })
      } else {
        // Fallback to REST API
        await axios.delete(`${BASE_URL}/message/${messageId}`, {
          withCredentials: true
        })
        setMessages(prev => prev.filter(msg => msg._id !== messageId))
        setShowDeleteConfirm(null)
        if (onMessageSent) {
          onMessageSent()
        }
      }
    } catch (err) {
      console.error('Error deleting message:', err)
      alert('Failed to delete message: ' + (err.response?.data?.error || err.message))
      setDeletingMessageId(null)
    }
  }

  const handleDeleteConversation = async () => {
    try {
      const socket = socketRef.current

      if (socket && socket.connected) {
        socket.emit('conversation:delete', { otherUserId: userId })
        setShowDeleteConversationConfirm(false)
      } else {
        // Fallback to REST API
        await axios.delete(`${BASE_URL}/conversation/${userId}`, {
          withCredentials: true
        })
        setMessages([])
        setShowDeleteConversationConfirm(false)
        if (onBack) {
          onBack()
        }
      }
    } catch (err) {
      console.error('Error deleting conversation:', err)
      alert('Failed to delete conversation: ' + (err.response?.data?.error || err.message))
      setShowDeleteConversationConfirm(false)
    }
  }

  const handleRemoveConnection = async () => {
    try {
      const socket = socketRef.current

      if (socket && socket.connected) {
        socket.emit('connection:remove', { otherUserId: userId })
        setShowRemoveConfirm(false)
      } else {
        // Fallback to REST API
        await axios.delete(`${BASE_URL}/connection/remove/${userId}`, {
          withCredentials: true
        })
        
        setMessages([])
        setShowRemoveConfirm(false)
        if (onMessageSent) {
          onMessageSent()
        }
        if (onBack) {
          onBack()
        }
      }
    } catch (err) {
      console.error('Error removing connection:', err)
      alert('Failed to remove connection: ' + (err.response?.data?.error || err.message))
      setShowRemoveConfirm(false)
    }
  }

  const handleBlockUser = async () => {
    try {
      const socket = socketRef.current

      if (socket && socket.connected) {
        socket.emit('connection:block', { otherUserId: userId })
        setShowBlockConfirm(false)
      } else {
        // Fallback to REST API
        await axios.post(`${BASE_URL}/connection/block/${userId}`, {}, {
          withCredentials: true
        })
        
        setIsBlocked(true)
        setMessages([])
        setShowBlockConfirm(false)
        if (onMessageSent) {
          onMessageSent()
        }
        if (onBack) {
          onBack()
        }
      }
    } catch (err) {
      console.error('Error blocking user:', err)
      alert('Failed to block user: ' + (err.response?.data?.error || err.message))
      setShowBlockConfirm(false)
    }
  }

  const handleUnblockUser = async () => {
    try {
      const socket = socketRef.current

      if (socket && socket.connected) {
        socket.emit('connection:unblock', { otherUserId: userId })
        setShowUnblockConfirm(false)
      } else {
        // Fallback to REST API
        const response = await axios.post(`${BASE_URL}/connection/unblock/${userId}`, {}, {
          withCredentials: true
        })
        
        setIsBlocked(false)
        setShowUnblockConfirm(false)
        
        // If connection was restored, fetch user and messages again
        if (response.data.data?.restored) {
          fetchUserAndMessages()
        }
        
        if (onMessageSent) {
          onMessageSent()
        }
      }
    } catch (err) {
      console.error('Error unblocking user:', err)
      alert('Failed to unblock user: ' + (err.response?.data?.error || err.message))
      setShowUnblockConfirm(false)
    }
  }

  // Check if user is blocked when component mounts
  useEffect(() => {
    const checkBlocked = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/connections/blocked`, {
          withCredentials: true
        })
        const blockedUsers = res.data.data || []
        const userIsBlocked = blockedUsers.some(u => u._id === userId)
        setIsBlocked(userIsBlocked)
      } catch (err) {
        console.error('Error checking blocked status:', err)
      }
    }
    
    if (userId) {
      checkBlocked()
    }
  }, [userId])

  if (loading) {
    return (
      <div className={`h-full flex items-center justify-center ${bg.primary}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col ${bg.primary} transition-colors duration-300`}>
      {/* Header */}
      <div className={`${bg.secondary} ${border.primary} border-b p-4 flex items-center justify-between`}>
        <div className="flex items-center">
          <button
            onClick={onBack}
            className={`p-2 ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-full transition-colors mr-3`}
          >
            <svg className={`w-6 h-6 ${text.primary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {otherUser && (
            <div className="flex items-center space-x-3">
              <img
                src={getImageUrl(otherUser.photourl)}
                alt={`${otherUser.firstName} ${otherUser.lastName}`}
                className="w-10 h-10 rounded-full object-cover border-2 border-pink-500"
                key={otherUser.photourl}
              />
              <div>
                <h2 className={`font-semibold ${text.primary}`}>
                  {otherUser.firstName} {otherUser.lastName}
                </h2>
                {isTyping && (
                  <p className="text-xs text-pink-500">typing...</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Connection Menu */}
        {otherUser && (
          <ConnectionMenu
            userId={userId}
            onRemove={() => setShowRemoveConfirm(true)}
            onBlock={() => setShowBlockConfirm(true)}
            onUnblock={() => setShowUnblockConfirm(true)}
            onDeleteChat={() => setShowDeleteConversationConfirm(true)}
            onReport={() => setShowReportModal(true)}
            isBlocked={isBlocked}
            showDeleteChat={true}
            showReport={true}
          />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className={text.muted}>No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const senderId = msg.senderId?._id || msg.senderId
            const isFromMe = senderId?.toString() === currentUser._id?.toString()
            const messageId = msg._id || index

            return (
              <div
                key={messageId}
                className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} group relative`}
                onMouseEnter={() => messageMenuRef.current[messageId] = true}
                onMouseLeave={() => messageMenuRef.current[messageId] = false}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative ${
                    isFromMe
                      ? `${message.sent} rounded-br-none`
                      : `${message.received} rounded-bl-none`
                  }`}
                >
                  <p className="break-words pr-6">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isFromMe ? 'text-white/70' : text.muted}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                  
                  {/* Delete Button - Only for user's own messages */}
                  {isFromMe && (
                    <button
                      onClick={() => setShowDeleteConfirm(messageId)}
                      disabled={deletingMessageId === messageId}
                      className={`absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                        isDark ? 'hover:bg-white/20' : 'hover:bg-black/10'
                      }`}
                      title="Delete message"
                    >
                      {deletingMessageId === messageId ? (
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className={`${message.received} px-4 py-2 rounded-2xl rounded-bl-none`}>
              <div className="flex space-x-1">
                <div className={`w-2 h-2 ${isDark ? 'bg-gray-400' : 'bg-gray-500'} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
                <div className={`w-2 h-2 ${isDark ? 'bg-gray-400' : 'bg-gray-500'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
                <div className={`w-2 h-2 ${isDark ? 'bg-gray-400' : 'bg-gray-500'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Delete Confirmation Modals */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(null)}>
          <div className={`${bg.secondary} rounded-xl p-6 max-w-md mx-4 ${border.primary} border`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold ${text.primary} mb-2`}>Delete Message?</h3>
            <p className={`${text.secondary} mb-4`}>This message will be deleted for you. The other person will still see it.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className={`px-4 py-2 ${button.secondary} rounded-lg font-medium`}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDeleteMessage(showDeleteConfirm)
                  setShowDeleteConfirm(null)
                }}
                className={`px-4 py-2 ${button.danger} rounded-lg font-medium`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConversationConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDeleteConversationConfirm(false)}>
          <div className={`${bg.secondary} rounded-xl p-6 max-w-md mx-4 ${border.primary} border`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold ${text.primary} mb-2`}>Delete Conversation?</h3>
            <p className={`${text.secondary} mb-4`}>This will delete all messages in this conversation for you. The other person will still see their messages.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConversationConfirm(false)}
                className={`px-4 py-2 ${button.secondary} rounded-lg font-medium`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConversation}
                className={`px-4 py-2 ${button.danger} rounded-lg font-medium`}
              >
                Delete Conversation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Connection Confirmation */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowRemoveConfirm(false)}>
          <div className={`${bg.secondary} rounded-xl p-6 max-w-md mx-4 ${border.primary} border`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold ${text.primary} mb-2`}>Remove Connection?</h3>
            <p className={`${text.secondary} mb-4`}>This will remove this connection. You won't be able to message each other until you reconnect.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className={`px-4 py-2 ${button.secondary} rounded-lg font-medium`}
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveConnection}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBlockConfirm(false)}>
          <div className={`${bg.secondary} rounded-xl p-6 max-w-md mx-4 ${border.primary} border`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold ${text.primary} mb-2`}>Block User?</h3>
            <p className={`${text.secondary} mb-4`}>This will block this user. They won't be able to message you or see your profile. You can unblock them later.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className={`px-4 py-2 ${button.secondary} rounded-lg font-medium`}
              >
                Cancel
              </button>
              <button
                onClick={handleBlockUser}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowUnblockConfirm(false)}>
          <div className={`${bg.secondary} rounded-xl p-6 max-w-md mx-4 ${border.primary} border`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-lg font-semibold ${text.primary} mb-2`}>Unblock User?</h3>
            <p className={`${text.secondary} mb-4`}>This will unblock this user. They will be able to message you again if you're connected.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUnblockConfirm(false)}
                className={`px-4 py-2 ${button.secondary} rounded-lg font-medium`}
              >
                Cancel
              </button>
              <button
                onClick={handleUnblockUser}
                className={`px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium`}
              >
                Unblock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className={`${bg.secondary} ${border.primary} border-t p-4`}>
        {!socketConnected && (
          <div className="mb-2 p-2 bg-yellow-500/10 border border-yellow-500 text-yellow-500 rounded-lg text-sm">
            ⚠️ Connecting to server...
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder={socketConnected ? "Type a message..." : "Connecting..."}
            className={`flex-grow px-4 py-3 ${bg.input} ${text.primary} ${border.secondary} border-2 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none disabled:opacity-50 placeholder-gray-400`}
            disabled={sending || !socketConnected}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || !socketConnected}
            className={`px-6 py-3 ${button.primary} rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </form>
      </div>

      {/* Report Modal */}
      {otherUser && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportedUserId={userId}
          reportedUserName={`${otherUser.firstName} ${otherUser.lastName}`}
        />
      )}
    </div>
  )
}

export default ChatPanel

