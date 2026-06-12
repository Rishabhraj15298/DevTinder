const jwt = require("jsonwebtoken");
const User = require("../models/user");

// Socket.io authentication middleware
const socketAuth = async (socket, next) => {
  try {
    console.log("🔐 Socket auth middleware called");
    
    // Get token from handshake auth, query, or cookies
    let token = socket.handshake.auth?.token;
    console.log("Token from auth:", token ? "present" : "missing");
    
    if (!token) {
      // Try to get from query
      token = socket.handshake.query?.token;
      console.log("Token from query:", token ? "present" : "missing");
    }
    
    if (!token && socket.handshake.headers?.cookie) {
      // Extract from cookie string
      const cookies = socket.handshake.headers.cookie.split(';');
      const jwtCookie = cookies.find(c => c.trim().startsWith('jwt='));
      if (jwtCookie) {
        token = jwtCookie.split('=')[1];
        console.log("Token from cookie: present");
      } else {
        console.log("Token from cookie: missing");
      }
    } else if (!token) {
      console.log("No cookie header present");
    }

    if (!token) {
      console.error("❌ Socket auth: No token provided");
      console.log("Auth object:", socket.handshake.auth);
      console.log("Query:", socket.handshake.query);
      console.log("Cookies:", socket.handshake.headers?.cookie);
      return next(new Error("Authentication error: No token provided"));
    }

    console.log("🔑 Socket auth: Token found, verifying...");

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(new Error("JWT_SECRET is not configured"));
    }
    
    const decoded = jwt.verify(token, jwtSecret);
    const user = await User.findById(decoded._id);

    if (!user) {
      console.error("❌ Socket auth: User not found");
      return next(new Error("Authentication error: User not found"));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = user._id.toString();
    console.log("✅ Socket auth: User authenticated:", user.firstName, user._id);
    next();
  } catch (err) {
    console.error("❌ Socket auth error:", err.message);
    console.error("Error stack:", err.stack);
    next(new Error("Authentication error: " + err.message));
  }
};

module.exports = { socketAuth };

