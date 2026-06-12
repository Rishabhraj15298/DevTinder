const express = require("express");
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require("../models/connectionRequest");
const user = require("../models/user");

const userRouter = express.Router();

// Route to get all connection requests sent to logged-in user
userRouter.get("/requests/received", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    // Fetch connection requests where logged-in user is the receiver
    const requests = await ConnectionRequest.find({
      toUserId: loggedInUser._id,
      status: "interested", // correct spelling
    }).populate("fromUserId", "firstName lastName photourl skills about gender college course branch");

    res.json({
      message: "Data fetched successfully",
      data: requests,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});





userRouter.get("/user/connections", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    // Fetch all accepted connections where the user is either sender or receiver
    const connections = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUser._id },
        { toUserId: loggedInUser._id },
      ],
      status: "accepted",
    }).populate("fromUserId toUserId", "firstName lastName photourl skills about gender college course branch");

    // Fetch blocked users (where current user blocked them)
    const blockedConnections = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUser._id, status: "blocked", blockedBy: loggedInUser._id },
        { toUserId: loggedInUser._id, status: "blocked", blockedBy: loggedInUser._id },
      ],
    }).populate("fromUserId toUserId", "firstName lastName photourl skills about gender college course branch");

    // Map accepted connections to return only the other user
    const connectionUsers = connections.map((row) => {
      if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
        return { ...row.toUserId.toObject(), connectionStatus: "accepted" };
      } else {
        return { ...row.fromUserId.toObject(), connectionStatus: "accepted" };
      }
    });

    // Map blocked users to return only the blocked user with status
    const blockedUsers = blockedConnections.map((row) => {
      if (row.fromUserId._id.toString() === loggedInUser._id.toString()) {
        return { ...row.toUserId.toObject(), connectionStatus: "blocked" };
      } else {
        return { ...row.fromUserId.toObject(), connectionStatus: "blocked" };
      }
    });

    // Combine both arrays
    const allConnections = [...connectionUsers, ...blockedUsers];

    res.json({
      message: "Connections fetched successfully",
      data: allConnections,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});




userRouter.get("/feed", userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;

    // Pagination params
    const page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    limit = limit > 50 ? 50 : limit; // max limit 50
    const skip = (page - 1) * limit;

    // Fetch all connection requests involving the logged-in user
    const connectionRequests = await ConnectionRequest.find({
      $or: [{ fromUserId: loggedInUser._id }, { toUserId: loggedInUser._id }],
    }).select("fromUserId toUserId status blockedBy");

    // Collect all users to hide from feed
    const hideUsersFromFeed = new Set();
    hideUsersFromFeed.add(loggedInUser._id.toString()); // hide self
    
    connectionRequests.forEach((request) => {
      const isCurrentUserSender = request.fromUserId.toString() === loggedInUser._id.toString();
      const isCurrentUserReceiver = request.toUserId.toString() === loggedInUser._id.toString();
      const otherUserId = isCurrentUserSender ? request.toUserId.toString() : request.fromUserId.toString();

      // Hide accepted connections (already connected)
      if (request.status === "accepted") {
        hideUsersFromFeed.add(request.fromUserId.toString());
        hideUsersFromFeed.add(request.toUserId.toString());
      } 
      // Hide blocked users (either direction of blocking)
      else if (request.status === "blocked") {
        hideUsersFromFeed.add(request.fromUserId.toString());
        hideUsersFromFeed.add(request.toUserId.toString());
      }
      // Hide users where current user already showed interest (waiting for their response)
      else if (request.status === "interested" && isCurrentUserSender) {
        hideUsersFromFeed.add(otherUserId);
      }
      // Hide users where current user ignored them (they swiped left)
      else if (request.status === "ignore" && isCurrentUserSender) {
        hideUsersFromFeed.add(otherUserId);
      }
      // Note: "rejected" status from the other user (they rejected current user's request) 
      // is NOT hidden - current user can still see them and potentially reconnect
    });

    // Build query for feed users
    const query = {
      _id: { $nin: Array.from(hideUsersFromFeed) },
    };

    // FIRST PRIORITY: Filter by interestedToConnectWith if set
    const interestedToConnectWith = loggedInUser.interestedToConnectWith;
    if (interestedToConnectWith) {
      if (interestedToConnectWith === "male") {
        query.gender = "male";
      } else if (interestedToConnectWith === "female") {
        query.gender = "female";
      }
      // If "both", don't filter by gender - show all
    }

    // Fetch all potential feed users (we'll score and sort them)
    const allUsers = await user.find(query)
      .select("firstName lastName photourl skills about gender college course branch interestedToConnectWith")
      .lean(); // Use lean() for better performance

    // Score users based on matching criteria
    const scoredUsers = allUsers.map((user) => {
      let score = 0;
      const reasons = [];

      // PRIORITY 1: College match (100 points)
      if (loggedInUser.college && user.college && 
          loggedInUser.college.toLowerCase().trim() === user.college.toLowerCase().trim()) {
        score += 100;
        reasons.push("same college");
      }

      // PRIORITY 2: Skills match (10 points per common skill)
      if (loggedInUser.skills && Array.isArray(loggedInUser.skills) && loggedInUser.skills.length > 0 &&
          user.skills && Array.isArray(user.skills) && user.skills.length > 0) {
        const loggedInSkills = loggedInUser.skills.map(s => s.toLowerCase().trim());
        const userSkills = user.skills.map(s => s.toLowerCase().trim());
        const commonSkills = loggedInSkills.filter(skill => userSkills.includes(skill));
        score += commonSkills.length * 10;
        if (commonSkills.length > 0) {
          reasons.push(`${commonSkills.length} common skill(s)`);
        }
      }

      // PRIORITY 3: Course match (50 points)
      if (loggedInUser.course && user.course && 
          loggedInUser.course.toLowerCase().trim() === user.course.toLowerCase().trim()) {
        score += 50;
        reasons.push("same course");
      }

      // PRIORITY 4: Branch match (30 points) - bonus
      if (loggedInUser.branch && user.branch && 
          loggedInUser.branch.toLowerCase().trim() === user.branch.toLowerCase().trim()) {
        score += 30;
        reasons.push("same branch");
      }

      return {
        ...user,
        matchScore: score,
        matchReasons: reasons,
      };
    });

    // Sort by score (descending) - highest scores first
    scoredUsers.sort((a, b) => b.matchScore - a.matchScore);

    // Apply pagination
    const paginatedUsers = scoredUsers.slice(skip, skip + limit);

    // Remove scoring metadata before sending response (optional - you can keep it for debugging)
    const responseUsers = paginatedUsers.map(({ matchScore, matchReasons, ...user }) => user);

    res.status(200).json({
      message: "Feed fetched successfully",
      data: responseUsers,
      // Optional: Include metadata for debugging
      // metadata: {
      //   total: scoredUsers.length,
      //   page,
      //   limit,
      //   hasMore: skip + limit < scoredUsers.length,
      // }
    });
  } catch (err) {
    console.error("Error fetching feed:", err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = userRouter;


// http://localhost:8008/feed?page=1&limit=10
