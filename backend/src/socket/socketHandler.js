const { verifyConnection, getConversation, markAsRead } = require("../services/socketService");
const Message = require("../models/message");
const User = require("../models/user");

// Store active users: userId -> socketId
const activeUsers = new Map();

const initializeSocket = (io) => {
  // Socket.io connection handling
  io.on("connection", (socket) => {
    const userId = socket.userId;
    const user = socket.user;

    console.log(`✅ User connected: ${user.firstName} (${userId})`);

    // Store user as active
    activeUsers.set(userId, socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Notify user's connections that they're online
    socket.broadcast.emit("user:online", { userId });

    // Handle sending message
    socket.on("message:send", async (data) => {
      try {
        console.log("📨 Received message:send event", { from: userId, data });
        
        const { receiverId, content } = data;

        // Validate input
        if (!receiverId || !content || content.trim().length === 0) {
          console.error("❌ Invalid message data:", { receiverId, content });
          socket.emit("message:error", { error: "Invalid message data" });
          return;
        }

        // Verify connection
        const isConnected = await verifyConnection(userId, receiverId);
        console.log("🔗 Connection verified:", isConnected, { userId, receiverId });
        
        if (!isConnected) {
          console.error("❌ Users are not connected");
          socket.emit("message:error", {
            error: "You can only message connected users",
          });
          return;
        }

        // Create message
        const message = new Message({
          senderId: userId,
          receiverId,
          content: content.trim(),
        });

        await message.save();
        console.log("💾 Message saved to database:", message._id);

        // Populate sender info
        await message.populate("senderId", "firstName lastName photourl");
        await message.populate("receiverId", "firstName lastName photourl");

        // Emit to receiver if online
        const receiverSocketId = activeUsers.get(receiverId.toString());
        console.log("👤 Receiver socket ID:", receiverSocketId, "Active users:", Array.from(activeUsers.keys()));
        
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("message:new", message);
          console.log("✅ Message sent to receiver (online)");
        } else {
          console.log("ℹ️ Receiver is offline, message saved for later");
        }

        // Confirm to sender
        socket.emit("message:sent", message);
        console.log("✅ Message confirmation sent to sender");
      } catch (err) {
        console.error("❌ Error sending message:", err);
        socket.emit("message:error", { error: "Failed to send message: " + err.message });
      }
    });

    // Handle typing indicator
    socket.on("typing:start", async (data) => {
      try {
        const { receiverId } = data;
        const isConnected = await verifyConnection(userId, receiverId);
        if (!isConnected) return;

        const receiverSocketId = activeUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("typing:start", {
            senderId: userId,
            senderName: user.firstName,
          });
        }
      } catch (err) {
        console.error("Error handling typing:", err);
      }
    });

    socket.on("typing:stop", async (data) => {
      try {
        const { receiverId } = data;
        const receiverSocketId = activeUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("typing:stop", { senderId: userId });
        }
      } catch (err) {
        console.error("Error handling typing stop:", err);
      }
    });

    // Handle fetching conversation
    socket.on("conversation:fetch", async (data) => {
      try {
        const { otherUserId, limit = 50, skip = 0 } = data;

        // Verify connection
        const isConnected = await verifyConnection(userId, otherUserId);
        if (!isConnected) {
          socket.emit("conversation:error", {
            error: "You can only view conversations with connected users",
          });
          return;
        }

        const messages = await getConversation(userId, otherUserId, limit, skip);
        socket.emit("conversation:data", { messages, otherUserId });
      } catch (err) {
        console.error("Error fetching conversation:", err);
        socket.emit("conversation:error", { error: "Failed to fetch conversation" });
      }
    });

    // Handle marking messages as read
    socket.on("messages:read", async (data) => {
      try {
        const { senderId } = data;
        await markAsRead(senderId, userId);

        // Notify sender that messages were read
        const senderSocketId = activeUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("messages:read", { receiverId: userId });
        }
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    });

    // Handle message delete
    socket.on("message:delete", async (data) => {
      try {
        const { messageId } = data;
        const message = await Message.findById(messageId);

        if (!message) {
          socket.emit("message:delete:error", { error: "Message not found" });
          return;
        }

        // Check if user is sender or receiver
        const isSender = message.senderId.toString() === userId.toString();
        const isReceiver = message.receiverId.toString() === userId.toString();

        if (!isSender && !isReceiver) {
          socket.emit("message:delete:error", { error: "You can only delete your own messages" });
          return;
        }

        // Soft delete: Add user to deletedFor array
        const userIdObj = userId;
        if (!message.deletedFor.includes(userIdObj)) {
          message.deletedFor.push(userIdObj);
          await message.save();
        }

        // Notify sender and receiver
        const otherUserId = isSender ? message.receiverId.toString() : message.senderId.toString();
        const otherUserSocketId = activeUsers.get(otherUserId);
        
        socket.emit("message:deleted", { messageId, deletedFor: userId });
        
        if (otherUserSocketId) {
          io.to(otherUserSocketId).emit("message:deleted", { messageId, deletedFor: userId });
        }

        console.log(`🗑️ Message ${messageId} deleted by ${userId}`);
      } catch (err) {
        console.error("Error deleting message:", err);
        socket.emit("message:delete:error", { error: err.message });
      }
    });

    // Handle conversation delete
    socket.on("conversation:delete", async (data) => {
      try {
        const { otherUserId } = data;

        // Verify connection
        const isConnected = await verifyConnection(userId, otherUserId);
        if (!isConnected) {
          socket.emit("conversation:delete:error", {
            error: "You can only delete conversations with connected users",
          });
          return;
        }

        // Soft delete all messages for this user
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

        // Notify the other user if online
        const otherUserSocketId = activeUsers.get(otherUserId.toString());
        if (otherUserSocketId) {
          io.to(otherUserSocketId).emit("conversation:deleted", {
            deletedBy: userId,
            deletedCount: result.modifiedCount,
          });
        }

        socket.emit("conversation:deleted", {
          otherUserId,
          deletedCount: result.modifiedCount,
        });

        console.log(`🗑️ Conversation with ${otherUserId} deleted by ${userId}, ${result.modifiedCount} messages deleted`);
      } catch (err) {
        console.error("Error deleting conversation:", err);
        socket.emit("conversation:delete:error", { error: err.message });
      }
    });

    // Handle remove connection
    socket.on("connection:remove", async (data) => {
      try {
        const { otherUserId } = data;
        const ConnectionRequest = require("../models/connectionRequest");
        const Message = require("../models/message");

        const connection = await ConnectionRequest.findOne({
          $or: [
            { fromUserId: userId, toUserId: otherUserId },
            { fromUserId: otherUserId, toUserId: userId },
          ],
          status: "accepted",
        });

        if (!connection) {
          socket.emit("connection:remove:error", { error: "Connection not found" });
          return;
        }

        // Delete connection
        await ConnectionRequest.findByIdAndDelete(connection._id);

        // Soft delete messages for both users
        await Message.updateMany(
          {
            $or: [
              { senderId: userId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: userId },
            ],
          },
          {
            $addToSet: { deletedFor: { $each: [userId, otherUserId] } },
          }
        );

        // Notify other user if online
        const otherUserSocketId = activeUsers.get(otherUserId.toString());
        if (otherUserSocketId) {
          io.to(otherUserSocketId).emit("connection:removed", {
            removedBy: userId,
            otherUserId,
          });
        }

        socket.emit("connection:removed", {
          otherUserId,
        });

        console.log(`👋 Connection with ${otherUserId} removed by ${userId}`);
      } catch (err) {
        console.error("Error removing connection:", err);
        socket.emit("connection:remove:error", { error: err.message });
      }
    });

    // Handle block user
    socket.on("connection:block", async (data) => {
      try {
        const { otherUserId } = data;
        const ConnectionRequest = require("../models/connectionRequest");
        const Message = require("../models/message");
        const User = require("../models/user");

        const otherUser = await User.findById(otherUserId);
        if (!otherUser) {
          socket.emit("connection:block:error", { error: "User not found" });
          return;
        }

        let connection = await ConnectionRequest.findOne({
          $or: [
            { fromUserId: userId, toUserId: otherUserId },
            { fromUserId: otherUserId, toUserId: userId },
          ],
        });

        if (connection) {
          connection.status = "blocked";
          connection.blockedBy = userId;
          await connection.save();
        } else {
          connection = new ConnectionRequest({
            fromUserId: userId,
            toUserId: otherUserId,
            status: "blocked",
            blockedBy: userId,
          });
          await connection.save();
        }

        // Soft delete messages for blocking user
        await Message.updateMany(
          {
            $or: [
              { senderId: userId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: userId },
            ],
          },
          {
            $addToSet: { deletedFor: userId },
          }
        );

        // Notify other user if online
        const otherUserSocketId = activeUsers.get(otherUserId.toString());
        if (otherUserSocketId) {
          io.to(otherUserSocketId).emit("connection:blocked", {
            blockedBy: userId,
            otherUserId,
          });
        }

        socket.emit("connection:blocked", {
          otherUserId,
          blockedBy: userId,
        });

        console.log(`🚫 User ${otherUserId} blocked by ${userId}`);
      } catch (err) {
        console.error("Error blocking user:", err);
        socket.emit("connection:block:error", { error: err.message });
      }
    });

    // Handle unblock user
    socket.on("connection:unblock", async (data) => {
      try {
        const { otherUserId } = data;
        const ConnectionRequest = require("../models/connectionRequest");
        const Message = require("../models/message");

        const connection = await ConnectionRequest.findOne({
          $or: [
            { fromUserId: userId, toUserId: otherUserId },
            { fromUserId: otherUserId, toUserId: userId },
          ],
          status: "blocked",
          blockedBy: userId,
        });

        if (!connection) {
          socket.emit("connection:unblock:error", { error: "Blocked connection not found" });
          return;
        }

        // Check for any messages between users (even soft-deleted ones count as history)
        const hasMessages = await Message.exists({
          $or: [
            { senderId: userId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: userId },
          ],
        });

        let restored = false;
        // If they had messages, they were previously connected, so restore to "accepted"
        if (hasMessages) {
          connection.status = "accepted";
          connection.blockedBy = null;
          await connection.save();
          restored = true;
          
          // Restore messages by removing userId from deletedFor array
          await Message.updateMany(
            {
              $or: [
                { senderId: userId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: userId },
              ],
              deletedFor: userId,
            },
            {
              $pull: { deletedFor: userId },
            }
          );
        } else {
          // If no messages, they were never connected, just delete the block
          await ConnectionRequest.findByIdAndDelete(connection._id);
        }

        // Notify other user if online
        const otherUserSocketId = activeUsers.get(otherUserId.toString());
        if (otherUserSocketId) {
          io.to(otherUserSocketId).emit("connection:unblocked", {
            byUserId: userId,
            otherUserId,
            restored,
          });
        }

        socket.emit("connection:unblocked", {
          otherUserId,
          restored,
        });

        console.log(`🔓 User ${otherUserId} unblocked by ${userId}${restored ? ' (connection restored)' : ''}`);
      } catch (err) {
        console.error("Error unblocking user:", err);
        socket.emit("connection:unblock:error", { error: err.message });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${user.firstName} (${userId})`);
      activeUsers.delete(userId.toString());
      console.log(`👥 Active users count: ${activeUsers.size}`);
      socket.broadcast.emit("user:offline", { userId });
    });
  });

  return io;
};

module.exports = { initializeSocket, activeUsers };

