const express = require("express");
const connectionManagementRouter = express.Router();
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const Message = require("../models/message");
const User = require("../models/user");
const Report = require("../models/report");

// Remove/Unfriend a connection (change status to rejected and delete messages)
connectionManagementRouter.delete("/connection/remove/:otherUserId", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;

    // Find the connection request (accepted status)
    const connection = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: userId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: userId },
      ],
      status: "accepted",
    });

    if (!connection) {
      return res.status(404).json({ error: "Connection not found" });
    }

    // Delete the connection request
    await ConnectionRequest.findByIdAndDelete(connection._id);

    // Soft delete all messages for both users
    await Message.updateMany(
      {
        $or: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      {
        $addToSet: { 
          deletedFor: { $each: [userId, otherUserId] }
        },
      }
    );

    res.json({
      message: "Connection removed successfully",
      data: { otherUserId },
    });
  } catch (err) {
    console.error("Error removing connection:", err);
    res.status(400).json({ error: err.message });
  }
});

// Block a user
connectionManagementRouter.post("/connection/block/:otherUserId", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;

    // Check if other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find existing connection request
    let connection = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: userId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: userId },
      ],
    });

    if (connection) {
      // Update existing connection to blocked
      connection.status = "blocked";
      connection.blockedBy = userId;
      await connection.save();
    } else {
      // Create new blocked connection
      connection = new ConnectionRequest({
        fromUserId: userId,
        toUserId: otherUserId,
        status: "blocked",
        blockedBy: userId,
      });
      await connection.save();
    }

    // Soft delete all messages for the blocking user
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

    res.json({
      message: "User blocked successfully",
      data: { otherUserId, blockedBy: userId },
    });
  } catch (err) {
    console.error("Error blocking user:", err);
    res.status(400).json({ error: err.message });
  }
});

// Unblock a user
connectionManagementRouter.post("/connection/unblock/:otherUserId", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;

    // Find blocked connection
    const connection = await ConnectionRequest.findOne({
      $or: [
        { fromUserId: userId, toUserId: otherUserId },
        { fromUserId: otherUserId, toUserId: userId },
      ],
      status: "blocked",
      blockedBy: userId, // Only allow unblocking if you blocked them
    });

    if (!connection) {
      return res.status(404).json({ error: "Blocked connection not found" });
    }

    // Check if users were previously connected
    // Check for any messages between users (even soft-deleted ones count as history of connection)
    const hasMessages = await Message.exists({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    });

    // If they had messages, they were previously connected, so restore to "accepted"
    // Always restore if there are any messages (even if soft-deleted)
    if (hasMessages) {
      connection.status = "accepted";
      connection.blockedBy = null;
      await connection.save();
      
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
          $pull: { deletedFor: userId }, // Remove userId from deletedFor array
        }
      );
      
      return res.json({
        message: "User unblocked successfully. Connection restored.",
        data: { otherUserId, restored: true },
      });
    }

    // If no messages, they were never connected, just delete the block
    await ConnectionRequest.findByIdAndDelete(connection._id);

    res.json({
      message: "User unblocked successfully",
      data: { otherUserId, restored: false },
    });
  } catch (err) {
    console.error("Error unblocking user:", err);
    res.status(400).json({ error: err.message });
  }
});

// Get blocked users list
connectionManagementRouter.get("/connections/blocked", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const blockedConnections = await ConnectionRequest.find({
      $or: [
        { fromUserId: userId, status: "blocked", blockedBy: userId },
        { toUserId: userId, status: "blocked", blockedBy: userId },
      ],
    })
      .populate("fromUserId toUserId", "firstName lastName photourl")
      .lean();

    // Map to return only the blocked user (not the current user)
    const blockedUsers = blockedConnections.map((conn) => {
      if (conn.fromUserId._id.toString() === userId.toString()) {
        return conn.toUserId;
      } else {
        return conn.fromUserId;
      }
    });

    res.json({
      message: "Blocked users fetched successfully",
      data: blockedUsers,
    });
  } catch (err) {
    console.error("Error fetching blocked users:", err);
    res.status(400).json({ error: err.message });
  }
});

// Report a user
connectionManagementRouter.post("/user/report/:reportedUserId", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { reportedUserId } = req.params;
    const { reason, description } = req.body;

    // Validate required fields
    if (!reason) {
      return res.status(400).json({ error: "Report reason is required" });
    }

    // Validate reason enum
    const validReasons = [
      "spam",
      "harassment",
      "inappropriate_content",
      "fake_profile",
      "scam",
      "other",
    ];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ 
        error: `Invalid reason. Must be one of: ${validReasons.join(", ")}` 
      });
    }

    // Check if reported user exists
    const reportedUser = await User.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user is trying to report themselves
    if (userId.toString() === reportedUserId.toString()) {
      return res.status(400).json({ error: "You cannot report yourself" });
    }

    // Check for duplicate report (same reporter, same user, same reason within 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingReport = await Report.findOne({
      reporterId: userId,
      reportedUserId: reportedUserId,
      reason: reason,
      createdAt: { $gte: oneDayAgo },
    });

    if (existingReport) {
      return res.status(400).json({ 
        error: "You have already reported this user for the same reason recently. Please wait 24 hours before reporting again." 
      });
    }

    // Create new report
    const report = new Report({
      reporterId: userId,
      reportedUserId: reportedUserId,
      reason: reason,
      description: description || "",
      status: "pending",
    });

    await report.save();

    res.status(201).json({
      message: "User reported successfully. Our team will review the report.",
      data: {
        reportId: report._id,
        reportedUserId: reportedUserId,
        reason: reason,
        status: report.status,
      },
    });
  } catch (err) {
    console.error("Error reporting user:", err);
    res.status(400).json({ error: err.message });
  }
});

// Get reports made by current user (optional: for users to see their own reports)
connectionManagementRouter.get("/user/reports", userAuth, async (req, res) => {
  try {
    const userId = req.user._id;

    const reports = await Report.find({ reporterId: userId })
      .populate("reportedUserId", "firstName lastName photourl")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      message: "Reports fetched successfully",
      data: reports,
    });
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = connectionManagementRouter;

