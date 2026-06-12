const mongoose = require("mongoose");

const connectionRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User", // add ref for clarity
    },
    status: {
      type: String,
      required: true,
      enum: ["ignore", "interested", "rejected", "accepted", "blocked"],
      message: `{VALUE} is not supported`,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// ✅ Index: Allow multiple entries with different statuses, but prevent duplicate active connections
// Partial unique index: Only enforce uniqueness for non-deleted/active statuses
connectionRequestSchema.index(
  { fromUserId: 1, toUserId: 1 },
  { 
    unique: true,
    partialFilterExpression: {
      status: { $in: ["interested", "accepted", "blocked", "ignore"] }
    }
  }
);

// Prevent self-request
connectionRequestSchema.pre("save", async function (next) {
  if (this.fromUserId.toString() === this.toUserId.toString()) {
    throw new Error("You cannot send a request to yourself");
  }
  next();
});

module.exports = mongoose.model("ConnectionRequest", connectionRequestSchema);
