const {userAuth} =require("../middlewares/auth");
const {validateEditProfileData}=require("../utils/validation");
const {uploadSingle} = require("../middlewares/upload");
const {uploadBase64ToCloudinary, uploadBufferToCloudinary, deleteFromCloudinary} = require("../utils/cloudinary");
const fs = require('fs');
const path = require('path');

const express = require('express'); 
const profileRouter = express.Router();

profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;

    // Calculate profile completion
    const isComplete = user.isProfileComplete();
    const completionPercentage = user.getProfileCompletion();

    // Send profile data as JSON with completion info
    res.status(200).json({
      ...user.toObject(),
      isProfileComplete: isComplete,
      profileCompletion: completionPercentage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get profile completion status
profileRouter.get("/profile/completion", userAuth, async (req, res) => {
  try {
    const user = req.user;
    const isComplete = user.isProfileComplete();
    const completionPercentage = user.getProfileCompletion();

    res.status(200).json({
      isProfileComplete: isComplete,
      profileCompletion: completionPercentage,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to check if URL is from Cloudinary
const isCloudinaryUrl = (url) => {
  return url && (url.includes('cloudinary.com') || url.startsWith('http'));
};

// Helper function to check if URL is local file
const isLocalFile = (url) => {
  return url && url.startsWith('/uploads/profiles/');
};

// Profile edit route - handles both file upload and JSON data
profileRouter.patch("/profile/edit", userAuth, uploadSingle, async (req, res) => {
    try{
      const loggedInUser = req.user;
      const updates = { ...req.body };
      const userId = loggedInUser._id.toString();

      // Handle file upload (if file was uploaded via multer)
      if (req.file) {
        try {
          // Upload file buffer to Cloudinary
          const photoUrl = await uploadBufferToCloudinary(req.file.buffer, userId, req.file.mimetype);
          
          if (photoUrl) {
            // Delete old profile photo from Cloudinary or local storage
            if (loggedInUser.photourl) {
              if (isCloudinaryUrl(loggedInUser.photourl)) {
                await deleteFromCloudinary(loggedInUser.photourl);
              } else if (isLocalFile(loggedInUser.photourl)) {
                // Also clean up local file if it exists
                const oldFilePath = path.join(__dirname, '../..', loggedInUser.photourl);
                if (fs.existsSync(oldFilePath)) {
                  fs.unlinkSync(oldFilePath);
                }
              }
            }
            updates.photourl = photoUrl;
          } else {
            // If upload failed, keep existing photo
            delete updates.photourl;
          }
        } catch (uploadError) {
          console.error('Error uploading file to Cloudinary:', uploadError);
          delete updates.photourl;
        }
      } else if (updates.photourl && updates.photourl.startsWith('data:image')) {
        // Handle base64 image (from frontend)
        try {
          const photoUrl = await uploadBase64ToCloudinary(updates.photourl, userId);
          
          if (photoUrl) {
            // Delete old profile photo from Cloudinary or local storage
            if (loggedInUser.photourl) {
              if (isCloudinaryUrl(loggedInUser.photourl)) {
                await deleteFromCloudinary(loggedInUser.photourl);
              } else if (isLocalFile(loggedInUser.photourl)) {
                // Also clean up local file if it exists
                const oldFilePath = path.join(__dirname, '../..', loggedInUser.photourl);
                if (fs.existsSync(oldFilePath)) {
                  fs.unlinkSync(oldFilePath);
                }
              }
            }
            updates.photourl = photoUrl;
          } else {
            // If upload failed, keep existing photo
            delete updates.photourl;
          }
        } catch (uploadError) {
          console.error('Error uploading base64 to Cloudinary:', uploadError);
          delete updates.photourl;
        }
      } else if (updates.photourl && isCloudinaryUrl(updates.photourl)) {
        // If it's already a Cloudinary URL, keep it as is
        // This handles cases where the URL is already uploaded
      } else if (updates.photourl && !isCloudinaryUrl(updates.photourl) && !isLocalFile(updates.photourl)) {
        // If it's not a valid URL format, remove it
        delete updates.photourl;
      }

      // Validate other fields using the validation utility
      // Create a validation object with body containing the updates
      const validationReq = { body: updates };
      if (!validateEditProfileData(validationReq)) {
        throw new Error("Invalid edit request - only photourl, about, gender, age, skills, college, course, branch, city, state, and interestedToConnectWith are allowed");
      }

      // Update user fields
      Object.keys(updates).forEach((key) => {
        // Skip photourl if it wasn't properly processed
        if (key === 'photourl' && !updates.photourl) {
          return;
        }
        
        if (key === 'age') {
          // Handle age - convert to number or set to undefined if empty
          if (updates[key] === '' || updates[key] === null || updates[key] === undefined) {
            loggedInUser[key] = undefined;
          } else {
            loggedInUser[key] = Number(updates[key]);
          }
        } else if (key === 'skills') {
          // Handle skills array
          if (Array.isArray(updates[key])) {
            loggedInUser[key] = updates[key];
          }
        } else if (key === 'college' || key === 'course' || key === 'branch' || key === 'city' || key === 'state') {
          // Handle education and location fields - allow empty strings to clear the field
          if (updates[key] === '' || updates[key] === null || updates[key] === undefined) {
            loggedInUser[key] = undefined; // Clear the field in database
          } else {
            loggedInUser[key] = String(updates[key]).trim(); // Save trimmed value
          }
        } else if (key === 'about' || key === 'gender') {
          // Handle about and gender - allow empty strings
          if (updates[key] === '' || updates[key] === null || updates[key] === undefined) {
            loggedInUser[key] = key === 'about' ? loggedInUser[key] : undefined; // Keep about default, clear gender
          } else {
            loggedInUser[key] = String(updates[key]).trim();
          }
        } else if (key === 'interestedToConnectWith') {
          // Handle interested to connect with field - allow empty to clear
          if (updates[key] === '' || updates[key] === null || updates[key] === undefined) {
            loggedInUser[key] = undefined; // Clear the field
          } else {
            // Validate enum value
            const validValues = ['male', 'female', 'both'];
            if (validValues.includes(updates[key].toLowerCase())) {
              loggedInUser[key] = updates[key].toLowerCase();
            }
          }
        } else if (updates[key] !== undefined && updates[key] !== '') {
          loggedInUser[key] = updates[key];
        }
      });
      
      await loggedInUser.save();
      
      // Calculate profile completion
      const isComplete = loggedInUser.isProfileComplete();
      const completionPercentage = loggedInUser.getProfileCompletion();
      
      res.json({
        message: `${loggedInUser.firstName}, Profile updated successfully`,
        user: {
          ...loggedInUser.toObject(),
          isProfileComplete: isComplete,
          profileCompletion: completionPercentage,
        }
      });

    } catch(err) {
        console.error('Profile update error:', err);
        res.status(400).json({ error: err.message });
    }
});


module.exports = profileRouter;
