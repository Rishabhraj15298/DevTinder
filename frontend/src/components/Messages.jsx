import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { BASE_URL } from '../utils/constants'
import { getSocket } from '../utils/socket'
import { markMessagesAsRead } from '../utils/messageUtils'

const Messages = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const currentUser = useSelector((state) => state.user)
  const [otherUser, setOtherUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [typing, setTyping] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [socketError, setSocketError] = useState(null)
  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  useEffect(() => {
    console.log('Messages component mounted', { userId, currentUser: !!currentUser })
    
    if (!userId) {
      console.warn('No userId provided, redirecting to connections')
      navigate('/connections')
      return
    }
    
    if (!currentUser) {
      console.warn('No current user, redirecting to connections')
      navigate('/connections')
      return
    }

    // Initialize socket with better connection handling
    const initializeSocketConnection = () => {
      try {
        socketRef.current = getSocket()
        console.log('🔌 Socket initialized:', socketRef.current?.id, 'Connected:', socketRef.current?.connected)
        
        if (!socketRef.current) {
          console.error('❌ Failed to get socket instance - token might be missing')
          setSocketError('Failed to initialize socket. Please make sure you are logged in.')
          return
        }

        // Set up connection handlers
        const onConnect = () => {
          console.log('✅ Socket connected successfully in Messages component')
          setSocketConnected(true)
          setSocketError(null)
          setupSocketListeners()
        }

        const onConnectError = (error) => {
          console.error('❌ Socket connection error:', error)
          setSocketConnected(false)
          setSocketError(error.message || 'Connection failed. Check if backend is running.')
        }

        const onDisconnect = (reason) => {
          console.log('⚠️ Socket disconnected:', reason)
          setSocketConnected(false)
        }

        // Remove old listeners
        socketRef.current.off('connect', onConnect)
        socketRef.current.off('connect_error', onConnectError)
        socketRef.current.off('disconnect', onDisconnect)

        // Add new listeners
        socketRef.current.on('connect', onConnect)
        socketRef.current.on('connect_error', onConnectError)
        socketRef.current.on('disconnect', onDisconnect)

        // If already connected, set up immediately
        if (socketRef.current.connected) {
          console.log('✅ Socket already connected')
          onConnect()
        } else {
          console.log('⏳ Waiting for socket connection...')
          // Force connection attempt
          if (!socketRef.current.connected) {
            socketRef.current.connect()
          }
        }
      } catch (err) {
        console.error('❌ Error initializing socket:', err)
        setSocketError(err.message || 'Failed to initialize socket')
        setSocketConnected(false)
      }
    }

    initializeSocketConnection()
    
    fetchUserAndMessages()

    return () => {
      // Cleanup socket listeners
      const socket = socketRef.current
      if (socket) {
        socket.off('message:new')
        socket.off('message:sent')
        socket.off('message:error')
        socket.off('typing:start')
        socket.off('typing:stop')
        socket.off('conversation:data')
      }
    }
  }, [userId, currentUser])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchUserAndMessages = async () => {
    try {
      setLoading(true)
      
      // Fetch other user details
      const userRes = await axios.get(`${BASE_URL}/user/connections`, {
        withCredentials: true
      })
      const user = userRes.data.data.find(u => u._id === userId)
      
      if (!user) {
        navigate('/connections')
        return
      }
      
      setOtherUser(user)

      // Fetch conversation
      const messagesRes = await axios.get(
        `${BASE_URL}/conversation/${userId}`,
        { withCredentials: true }
      )
      setMessages(messagesRes.data.data || [])
      
      // Mark messages as read when conversation is opened
      markMessagesAsRead(userId, getSocket)
    } catch (err) {
      console.error('Error fetching messages:', err)
      navigate('/connections')
    } finally {
      setLoading(false)
    }
  }

  const setupSocketListeners = () => {
    const socket = socketRef.current
    if (!socket) {
      console.warn('Socket not initialized')
      return
    }

    if (!socket.connected) {
      console.warn('Socket not connected, waiting for connection...')
      socket.once('connect', () => {
        console.log('Socket connected, setting up listeners')
        setupSocketListeners()
      })
      return
    }

    console.log('🔌 Setting up socket listeners for user:', userId)

    // Remove existing listeners to avoid duplicates
    socket.off('message:new')
    socket.off('message:sent')
    socket.off('message:error')
    socket.off('typing:start')
    socket.off('typing:stop')

    // Listen for new messages
    socket.on('message:new', (message) => {
      console.log('📨 Received message:new event', message)
      const senderId = message.senderId?._id || message.senderId
      const senderIdStr = senderId?.toString() || senderId
      const userIdStr = userId?.toString() || userId
      
      if (senderIdStr === userIdStr) {
        console.log('✅ Adding new message to list')
        setMessages(prev => [...prev, message])
        setIsTyping(false)
      } else {
        console.log('⚠️ Message from different user, ignoring')
      }
    })

    // Listen for sent confirmation
    socket.on('message:sent', (message) => {
      console.log('✅ Received message:sent confirmation', message)
      // Check if this message is from current user to the other user
      const senderId = message.senderId?._id || message.senderId
      const senderIdStr = senderId?.toString() || senderId
      const currentUserIdStr = currentUser._id?.toString() || currentUser._id
      
      // If message is sent by current user, add it to the list
      if (senderIdStr === currentUserIdStr) {
        console.log('✅ Adding sent message to list')
        setMessages(prev => {
          // Update if message already exists, otherwise add
          const exists = prev.find(m => m._id === message._id)
          if (exists) {
            console.log('⚠️ Message already exists, skipping')
            return prev
          }
          return [...prev, message]
        })
        setSending(false)
      } else {
        console.log('⚠️ Message confirmation for different sender')
      }
    })

    // Listen for errors
    socket.on('message:error', (data) => {
      console.error('Message error:', data.error)
      setSending(false)
      alert(data.error)
    })

    // Listen for typing indicators
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
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    const socket = socketRef.current
    if (!socket) {
      console.error('Socket not available')
      alert('Socket not initialized. Please refresh the page.')
      return
    }

    if (!socket.connected && !socketConnected) {
      console.error('Socket not connected, current state:', {
        connected: socket.connected,
        socketConnected,
        socketId: socket.id
      })
      alert('Socket not connected. Please wait a moment and try again, or refresh the page.')
      return
    }

    setSending(true)
    const messageContent = newMessage.trim()
    setNewMessage('')

    console.log('Sending message:', { receiverId: userId, content: messageContent })

    // Emit typing stop
    socket.emit('typing:stop', { receiverId: userId })

    // Send message via socket
    socket.emit('message:send', {
      receiverId: userId,
      content: messageContent,
    }, (response) => {
      // Optional acknowledgment callback
      if (response && response.error) {
        console.error('Message send error:', response.error)
        alert(response.error)
        setSending(false)
      }
    })

    // Set a timeout in case no response comes
    setTimeout(() => {
      if (sending) {
        console.warn('Message send timeout, resetting sending state')
        setSending(false)
      }
    }, 5000)
  }

  const handleTyping = (e) => {
    setNewMessage(e.target.value)

    const socket = socketRef.current
    if (!socket) return

    // Emit typing start
    if (!typing) {
      setTyping(true)
      socket.emit('typing:start', { receiverId: userId })
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (socket) {
        socket.emit('typing:stop', { receiverId: userId })
      }
      setTyping(false)
    }, 1000)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading messages...</p>
        </div>
      </div>
    )
  }

  if (!otherUser) {
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/connections')}
            className="text-gray-600 hover:text-purple-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <img
            src={otherUser.photourl || 'https://via.placeholder.com/50'}
            alt={otherUser.firstName}
            className="w-12 h-12 rounded-full object-cover border-2 border-purple-200"
          />
          <div className="flex-grow">
            <h2 className="text-lg font-bold text-gray-800">
              {otherUser.firstName} {otherUser.lastName}
            </h2>
            {isTyping && (
              <p className="text-sm text-gray-500 italic">typing...</p>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const senderId = message.senderId?._id || message.senderId
            const isOwn = senderId === currentUser._id
            return (
              <div
                key={message._id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs sm:max-w-md px-4 py-2 rounded-2xl ${
                    isOwn
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-white text-gray-800 shadow-md'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwn ? 'text-white/70' : 'text-gray-500'
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        {!socketConnected && (
          <div className="mb-2 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-lg text-sm max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-yellow-600"></div>
                <span>⚠️ Connecting to server... Please wait.</span>
              </div>
              <button
                onClick={() => {
                  console.log('Retrying socket connection...')
                  setSocketError(null)
                  if (socketRef.current) {
                    socketRef.current.disconnect()
                    socketRef.current = null
                  }
                  socketRef.current = getSocket()
                  if (socketRef.current) {
                    socketRef.current.on('connect', () => {
                      console.log('✅ Socket reconnected')
                      setSocketConnected(true)
                      setSocketError(null)
                      setupSocketListeners()
                    })
                    socketRef.current.on('connect_error', (error) => {
                      console.error('❌ Retry connection error:', error)
                      setSocketError(error.message)
                    })
                  }
                }}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition-colors"
              >
                Retry
              </button>
            </div>
            {socketError && (
              <div className="mt-2 text-xs text-red-600">
                Error: {socketError}
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder={socketConnected ? "Type a message..." : "Connecting..."}
            className="flex-grow px-4 py-3 bg-gray-700 text-white border-2 border-gray-600 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all outline-none disabled:bg-gray-600 placeholder-gray-400"
            disabled={sending || !socketConnected}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending || !socketConnected}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {!socketConnected ? 'Connecting...' : sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Messages

