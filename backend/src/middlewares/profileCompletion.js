const { userAuth } = require("./auth");

// Middleware to check if user profile is complete
const checkProfileCompletion = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const isComplete = user.isProfileComplete();
    const completionPercentage = user.getProfileCompletion();

    if (!isComplete) {
      return res.status(403).json({
        error: "Profile incomplete. Please complete your profile to access this feature.",
        isProfileComplete: false,
        profileCompletion: completionPercentage,
        redirectTo: "/profile",
      });
    }

    // Attach completion info to request
    req.profileCompletion = {
      isComplete: true,
      completionPercentage,
    };

    next();
  } catch (err) {
    console.error("Profile completion check error:", err);
    res.status(500).json({ error: "Error checking profile completion" });
  }
};

// Combined middleware: auth + profile completion check
const userAuthWithProfile = [userAuth, checkProfileCompletion];

module.exports = { checkProfileCompletion, userAuthWithProfile };

