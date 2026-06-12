const validator = require("validator");

const validateSignUpData = (req) => {
  const { firstName, lastName, emailId, password } = req.body;

  if (!firstName || !lastName) {
    throw new Error("First name and last name are required.");
  }

  if (!validator.isEmail(emailId)) {
    throw new Error("Enter a valid email address.");
  }

  if (!validator.isStrongPassword(password)) {
    throw new Error("Password must be strong (min 8 chars, mix of upper/lowercase, number & symbol).");
  }
};

const validateEditProfileData = (req) => {
  const allowedEditFields = ["photourl", "about", "gender", "age", "skills", "college", "course", "branch", "city", "state", "interestedToConnectWith"];
  const updates = Object.keys(req.body);
  const isEditAllowed = updates.every((field) => allowedEditFields.includes(field));
  return isEditAllowed;
};

module.exports = { validateSignUpData, validateEditProfileData };
