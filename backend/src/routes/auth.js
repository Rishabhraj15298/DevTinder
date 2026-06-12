const {validateSignUpData}=require("../utils/validation");
const bcrypt=require("bcrypt");
const cookieParser = require("cookie-parser");
const jwt=require("jsonwebtoken");
const User=require("../models/user");
const {userAuth} =require("../middlewares/auth");
const validator = require("validator");


const express=require ("express");
const authRouter=express.Router();

authRouter.post("/signup", async (req, res) => {
  try {
    validateSignUpData(req);

    const { firstName, lastName, emailId, password } = req.body;

    // ✅ Check if user already exists
    const existingUser = await User.findOne({ emailId });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists. Please login instead." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      firstName,
      lastName,
      emailId,
      password: passwordHash,
    });

    await user.save();

    // Generate JWT and set cookie (auto-login after signup)
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }
    
    const token = jwt.sign({ _id: user._id }, jwtSecret, {
      expiresIn: "7d",
    });

    // Send cookie + response (auto-login after signup)
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true", // Must be true for HTTPS
      sameSite: process.env.COOKIE_SAME_SITE === "none" ? "none" : (process.env.COOKIE_SAME_SITE || "lax"),
      path: "/" // Ensure cookie is available for all paths
    };
    
    res.cookie("jwt", token, cookieOptions);

    res.status(201).send({ message: "User created successfully", user });
  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(400).send({ error: error.message });
  }
});



authRouter.post("/login", async (req, res) => {
  try {
    const { emailId, password } = req.body;

    // Validate email
    if (!validator.isEmail(emailId)) {
      throw new Error("Enter a valid email");
    }

    // Find user
    const user = await User.findOne({ emailId });
    if (!user) {
      throw new Error("Email not found in DB");
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    // Generate JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not configured");
    }
    
    const token = jwt.sign({ _id: user._id }, jwtSecret, {
      expiresIn: "7d",
    });

    // Send cookie + response
    // For cross-origin cookies (Vercel → Render), we need:
    // - secure: true (HTTPS required)
    // - sameSite: 'none' (allows cross-origin)
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true", // Must be true for HTTPS
      sameSite: process.env.COOKIE_SAME_SITE === "none" ? "none" : (process.env.COOKIE_SAME_SITE || "lax"),
      path: "/" // Ensure cookie is available for all paths
    };
    
    // Don't set domain - let browser handle it automatically for cross-origin
    // Setting domain explicitly can break cross-origin cookies
    
    res.cookie("jwt", token, cookieOptions);

    res.status(200).send(user);

  } catch (err) {
    console.error("Login error:", err.message);
    res.status(400).send({ error: err.message });
  }
});

authRouter.post("/logout",userAuth, (req, res) => {
  try {
    // Clear cookie with same options as setting it
    const cookieOptions = {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: process.env.COOKIE_SAME_SITE === "none" ? "none" : (process.env.COOKIE_SAME_SITE || "lax"),
      path: "/"
    };
    
    res.cookie("jwt", "", cookieOptions);
    res.status(200).send({ message: "Logged out successfully" });
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});
module.exports=authRouter;
