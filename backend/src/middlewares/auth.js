// const jwt = require("jsonwebtoken");
// const User = require("../models/user");

// const userAuth = async (req, res, next) => {
//   try {
//     // 🔑 Get the token from the cookie named "jwt"
//     const token = req.cookies.jwt;

//     if (!token) {
//       throw new Error("No token provided");
//     }

//     // Verify token
//     const decodedObj = jwt.verify(token, "DEV@Tinder$790");
//     const { _id } = decodedObj;

//     // Find user
//     const user = await User.findById(_id);
//     if (!user) {
//       throw new Error("User not found");
//     }

//     // Attach user to request
//     req.user = user;
//     next();

//   } catch (err) {
//     res.status(401).json({ error: err.message });
//   }
// };

// module.exports = { userAuth };
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const userAuth = async (req, res, next) => {
  try {
    // Debug: Log cookie information (remove in production if needed)
    if (process.env.NODE_ENV !== 'production') {
      console.log("🔍 Auth check - Cookies received:", Object.keys(req.cookies));
      console.log("🔍 Auth check - Cookie header:", req.headers.cookie ? "present" : "missing");
    }
    
    const token = req.cookies.jwt; // ✅ token from cookie
    if (!token) {
      // Also check Authorization header as fallback (for debugging)
      const authHeader = req.headers.authorization;
      if (process.env.NODE_ENV !== 'production' && authHeader) {
        console.log("⚠️ No cookie, but Authorization header present");
      }
      return res.status(401).json({ error: "Please login" });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ error: "JWT_SECRET is not configured" });
    }
    
    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded._id);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Invalid or expired token. Please login again." });
    }
    res.status(401).json({ error: "Unauthorized: " + err.message });
  }
};

module.exports = { userAuth };
