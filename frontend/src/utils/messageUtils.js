/**
 * Message utility functions for managing unread counts and message status
 */

/**
 * Mark messages as read for a specific conversation
 * @param {string} otherUserId - The ID of the other user in the conversation
 * @param {Function} getSocket - Function to get the socket instance
 */
export const markMessagesAsRead = (otherUserId, getSocket) => {
  try {
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('messages:read', { senderId: otherUserId });
      console.log('📖 Marked messages as read for user:', otherUserId);
    }
  } catch (err) {
    console.error('Error marking messages as read:', err);
  }
};

/**
 * Update unread count in conversation list when messages are read
 * @param {Array} conversations - Current conversations list
 * @param {string} userId - User ID whose messages were read
 * @returns {Array} Updated conversations list
 */
export const updateUnreadCountOnRead = (conversations, userId) => {
  return conversations.map(conv => {
    if (conv._id?.toString() === userId?.toString()) {
      return {
        ...conv,
        unreadCount: 0
      };
    }
    return conv;
  });
};

/**
 * Format timestamp for display
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted time string
 */
export const formatMessageTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

