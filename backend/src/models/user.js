const mongoose = require("mongoose");
const validators=require("validator");
const bcrypt=require("bcrypt");
const jwt=require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minlength: 4,
      maxlength: 30,
    },
    lastName: {
      type: String,
    },
    emailId: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate(value){
        if(!validators.isEmail(value)){
          throw new Error("invalid email "+ value );
          
        }
      }
    },
    password: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      min: 0,
      max: 120,
    },
    gender: {
      type: String,
      validate(value) {
        if (!["male", "female", "others"].includes(value.toLowerCase())) {
          throw new Error("Gender data is not valid");
        }
      },
    },
    photourl: {
      type: String,
      default:
        "https://tse2.mm.bing.net/th/id/OIP.b-VXMyLRKFeTc9B0RNFAXwHaHa?pid=Api&P=0&h=180",
    },
    about: {
      type: String,
      default: "Hey! I am using this app.",
    },
    skills: {
      type: [String],
    },
    college: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    course: {
      type: String,
      trim: true,
      enum: ["B.Tech", "M.Tech", "B.E", "M.E", "Diploma", "B.Sc", "M.Sc", "BCA", "MCA", "BBA", "MBA", "Other"],
    },
    branch: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    state: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    interestedToConnectWith: {
      type: String,
      enum: ["male", "female", "both"],
      default: null,
    },
  },

  {
    timestamps: true,
  }
);

// Method to check if profile is complete
userSchema.methods.isProfileComplete = function() {
  const requiredFields = {
    college: this.college,
    course: this.course,
    branch: this.branch,
    skills: this.skills && this.skills.length > 0,
    age: this.age,
    gender: this.gender,
  };

  // Check if all required fields are filled
  return Object.values(requiredFields).every(field => {
    if (Array.isArray(field)) {
      return field.length > 0;
    }
    return field !== null && field !== undefined && field !== '';
  });
};

// Method to calculate profile completion percentage
userSchema.methods.getProfileCompletion = function() {
  const requiredFields = {
    college: this.college,
    course: this.course,
    branch: this.branch,
    skills: this.skills && this.skills.length > 0,
    age: this.age,
    gender: this.gender,
  };

  const optionalFields = {
    about: this.about && this.about !== 'Hey! I am using this app.',
    photourl: this.photourl && !this.photourl.includes('OIP.b-VXMyLRKFeTc9B0RNFAXwHaHa'), // Not default photo
    city: this.city,
    state: this.state,
  };

  // Required fields weight: 60% (each field ~10%)
  let requiredScore = 0;
  const requiredCount = Object.keys(requiredFields).length;
  Object.values(requiredFields).forEach(field => {
    if (Array.isArray(field)) {
      if (field.length > 0) requiredScore += 1;
    } else {
      if (field !== null && field !== undefined && field !== '') requiredScore += 1;
    }
  });
  const requiredPercentage = (requiredScore / requiredCount) * 60;

  // Optional fields weight: 40% (each field ~13.33%)
  let optionalScore = 0;
  const optionalCount = Object.keys(optionalFields).length;
  Object.values(optionalFields).forEach(field => {
    if (field) optionalScore += 1;
  });
  const optionalPercentage = (optionalScore / optionalCount) * 40;

  return Math.round(requiredPercentage + optionalPercentage);
};
userSchema.index({firstName:1,lastName:1});
userSchema.index({gender:1});



// userSchema.methods.getJWT= async function(){
//   const user=this;
//   const token=await jwt.sign({_id:user._id},"DEV@Tinder$790",{expiresIn:"7d"});
//   return token;
// }
// userSchema.methods.validatePassword=async function(passwordInputBy){
//   const user=this;
//   const passwordHash=user.password;
//   const isPasswordValid=await bcrypt.compare(passwordInputBy,passwordHash);
//   return isPasswordValid;

// }

module.exports = mongoose.model("User", userSchema);
