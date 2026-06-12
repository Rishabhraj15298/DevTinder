import { io } from "socket.io-client";
import { BASE_URL } from "./constants";

// Get JWT token from cookies
// Note: httpOnly cookies cannot be read by JavaScript, but they are sent automatically with requests
const getToken = () => {
  try {
    const cookies = document.cookie.split(';');
    const jwtCookie = cookies.find(c => c.trim().startsWith('jwt='));
    if (jwtCookie) {
      return jwtCookie.split('=')[1];
    }
    // If cookie is httpOnly, it won't be in document.cookie
    // But it will be sent automatically with the socket connection
    // Return a placeholder to allow connection attempt
    console.log("⚠️ Token not in document.cookie (might be httpOnly - will be sent automatically)");
    return "httpOnly"; // Placeholder - actual token will come from cookie header
  } catch (err) {
    console.error("Error reading cookies:", err);
    return null;
  }
};

// Create socket connection
let socket = null;

export const initSocket = () => {
  if (socket?.connected) {
    console.log("✅ Socket already connected:", socket.id);
    return socket;
  }

  const token = getToken();
  
  // If token is "httpOnly", don't include it in auth/query - let cookie be sent automatically
  const useCookieAuth = token === "httpOnly";
  
  if (!token && !useCookieAuth) {
    console.error("❌ No token found - please login again");
    return null;
  }

  console.log("🔌 Initializing socket connection to:", BASE_URL);
  console.log("🔑 Using cookie-based auth:", useCookieAuth);
  
  const socketOptions = {
    transports: ["websocket", "polling"],
    withCredentials: true, // This ensures cookies are sent
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000, // 20 seconds timeout
    forceNew: false, // Reuse existing connection if available
  };
  
  // Only add token to auth/query if it's not httpOnly
  if (!useCookieAuth && token) {
    socketOptions.auth = { token: token };
    socketOptions.query = { token: token };
  }
  
  socket = io(BASE_URL, socketOptions);
  
  console.log("🔌 Socket instance created, waiting for connection...");

  socket.on("connect", () => {
    console.log("✅ Socket connected successfully!");
    console.log("Socket ID:", socket.id);
    console.log("Transport:", socket.io.engine.transport.name);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error!");
    console.error("Error message:", error.message);
    console.error("Error type:", error.type);
    console.error("Error description:", error.description);
    console.error("Error data:", error.data);
    console.error("Full error object:", error);
    console.error("Socket URL:", BASE_URL);
    console.error("Token in auth:", socket.auth?.token ? "present" : "missing");
    console.error("Token in query:", socket.handshake?.query?.token ? "present" : "missing");
  });

  socket.on("reconnect", (attemptNumber) => {
    console.log("✅ Socket reconnected after", attemptNumber, "attempts");
  });

  socket.on("reconnect_error", (error) => {
    console.error("❌ Socket reconnection error:", error.message);
  });

  socket.on("reconnect_failed", () => {
    console.error("❌ Socket reconnection failed");
  });

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    console.log("🔌 Socket not initialized, creating new connection...");
    return initSocket();
  }
  
  // If socket exists but not connected, try to reconnect
  if (!socket.connected) {
    console.log("⚠️ Socket exists but not connected, attempting to connect...");
    socket.connect();
  }
  
  return socket;
};

// Check if socket is connected
export const isSocketConnected = () => {
  return socket?.connected || false;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

