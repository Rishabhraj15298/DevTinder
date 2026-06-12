const ConnectionRequest = require("../models/connectionRequest");
const Message = require("../models/message");
const User = require("../models/user");

// Verify if two users are connected (accepted status and not blocked)
const verifyConnection = async (userId1, userId2) => {
  try {
    // Convert to ObjectId if they're strings
    const mongoose = require("mongoose");
    const id1 = typeof userId1 === 'string' ? new mongoose.Types.ObjectId(userId1) : userId1;
    const id2 = typeof userId2 === 'string' ? new mongoose.Types.ObjectId(userId2) : userId2;
    
    // Check if either user has blocked the other
    const blockedCheck = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: id1, toUserId: id2, status: "blocked" },
        { fromUserId: id2, toUserId: id1, status: "blocked" },
      ],
    });

    if (blockedCheck) {
      console.log("🔍 Connection check: Blocked", { userId1: id1.toString(), userId2: id2.toString() });
      return false;
    }
    
    // Check for accepted connection
    const connection = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: id1, toUserId: id2 },
        { fromUserId: id2, toUserId: id1 },
      ],
      status: "accepted",
    });

    console.log("🔍 Connection check:", { userId1: id1.toString(), userId2: id2.toString(), found: !!connection });
    return !!connection;
  } catch (err) {
    console.error("❌ Error verifying connection:", err);
    return false;
  }
};

// Get conversation between two users (excluding messages deleted by userId1)
const getConversation = async (userId1, userId2, limit = 50, skip = 0) => {
  try {
    const mongoose = require("mongoose");
    const id1 = typeof userId1 === 'string' ? new mongoose.Types.ObjectId(userId1) : userId1;
    
    const messages = await Message.find({
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
      deletedFor: { $ne: id1 }, // Exclude messages deleted by userId1
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate("senderId", "firstName lastName photourl")
      .populate("receiverId", "firstName lastName photourl")
      .lean();

    return messages.reverse(); // Return in chronological order
  } catch (err) {
    console.error("Error getting conversation:", err);
    return [];
  }
};

// Mark messages as read
const markAsRead = async (senderId, receiverId) => {
  try {
    await Message.updateMany(
      {
        senderId,
        receiverId,
        read: false,
      },
      {
        read: true,
        readAt: new Date(),
      }
    );
  } catch (err) {
    console.error("Error marking messages as read:", err);
  }
};

// Get unread message count for a user (excluding deleted messages)
const getUnreadCount = async (userId) => {
  try {
    const mongoose = require("mongoose");
    const id = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
    
    const count = await Message.countDocuments({
      receiverId: id,
      read: false,
      deletedFor: { $ne: id }, // Exclude deleted messages
    });
    return count;
  } catch (err) {
    console.error("Error getting unread count:", err);
    return 0;
  }
};

module.exports = {
  verifyConnection,
  getConversation,
  markAsRead,
  getUnreadCount,
};

