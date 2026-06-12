const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    reason: {
      type: String,
      required: true,
      enum: [
        "spam",
        "harassment",
        "inappropriate_content",
        "fake_profile",
        "scam",
        "other",
      ],
      message: `{VALUE} is not a supported report reason`,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["pending", "reviewed", "resolved", "dismissed"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent self-reporting
reportSchema.pre("save", async function (next) {
  if (this.reporterId.toString() === this.reportedUserId.toString()) {
    throw new Error("You cannot report yourself");
  }
  next();
});

// Index for efficient querying
reportSchema.index({ reporterId: 1, reportedUserId: 1 });
reportSchema.index({ reportedUserId: 1, status: 1 });
reportSchema.index({ status: 1, createdAt: -1 });

// Prevent duplicate reports (same reporter reporting same user with same reason within 24 hours)
reportSchema.index(
  { reporterId: 1, reportedUserId: 1, reason: 1, createdAt: 1 },
  {
    unique: false,
  }
);

module.exports = mongoose.model("Report", reportSchema);

