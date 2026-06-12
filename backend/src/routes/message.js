const express = require("express");
const messageRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const Message = require("../models/message");
const { verifyConnection, getConversation, getUnreadCount, markAsRead } = require("../services/socketService");
const User = require("../models/user");

// Get all conversations (list of users you've messaged)
messageRouter.get("/conversations", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get distinct users from messages (both sent and received, excluding deleted)
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
          deletedFor: { $ne: userId }, // Exclude messages deleted by current user
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$senderId", userId] },
              "$receiverId",
              "$senderId",
            ],
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$receiverId", userId] }, { $eq: ["$read", false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: "$user._id",
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          photourl: "$user.photourl",
          lastMessage: {
            content: "$lastMessage.content",
            createdAt: "$lastMessage.createdAt",
            senderId: "$lastMessage.senderId",
          },
          unreadCount: 1,
        },
      },
      {
        $sort: { "lastMessage.createdAt": -1 },
      },
    ]);

    res.status(200).json({
      message: "Conversations fetched successfully",
      data: conversations,
    });
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(400).json({ error: err.message });
  }
});

// Get conversation with a specific user
messageRouter.get("/conversation/:otherUserId", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    // Verify connection
    const isConnected = await verifyConnection(userId, otherUserId);
    if (!isConnected) {
      return res.status(403).json({
        error: "You can only view conversations with connected users",
      });
    }

    const messages = await getConversation(userId, otherUserId, limit, skip);

    // Mark messages as read when conversation is viewed
    await markAsRead(otherUserId, userId);

    res.json({
      message: "Conversation fetched successfully",
      data: messages,
    });
  } catch (err) {
    console.error("Error fetching conversation:", err);
    res.status(400).json({ error: err.message });
  }
});

// Get unread message count
messageRouter.get("/unread-count", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await getUnreadCount(userId);

    res.json({
      message: "Unread count fetched successfully",
      count,
    });
  } catch (err) {
    console.error("Error fetching unread count:", err);
    res.status(400).json({ error: err.message });
  }
});

// Delete a single message
messageRouter.delete("/message/:messageId", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    // Check if user is sender or receiver
    const isSender = message.senderId.toString() === userId.toString();
    const isReceiver = message.receiverId.toString() === userId.toString();

    if (!isSender && !isReceiver) {
      return res.status(403).json({ error: "You can only delete your own messages" });
    }

    // Add user to deletedFor array (soft delete)
    const userIdObj = userId;
    if (!message.deletedFor.includes(userIdObj)) {
      message.deletedFor.push(userIdObj);
      await message.save();
    }

    res.json({
      message: "Message deleted successfully",
      data: message,
    });
  } catch (err) {
    console.error("Error deleting message:", err);
    res.status(400).json({ error: err.message });
  }
});

// Delete entire conversation with a user
messageRouter.delete("/conversation/:otherUserId", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;

    // Verify connection
    const isConnected = await verifyConnection(userId, otherUserId);
    if (!isConnected) {
      return res.status(403).json({
        error: "You can only delete conversations with connected users",
      });
    }

    // Soft delete all messages in the conversation for this user
    const result = await Message.updateMany(
      {
        $or: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
        deletedFor: { $ne: userId },
      },
      {
        $addToSet: { deletedFor: userId },
      }
    );

    res.json({
      message: "Conversation deleted successfully",
      deletedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("Error deleting conversation:", err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = messageRouter;

