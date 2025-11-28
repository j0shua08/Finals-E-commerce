const { v7: uuid } = require("uuid");
const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const User = require("../models/user");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      "Fetching users failed, please try again later.",
      500
    );
    return next(error);
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("[SIGNUP] Validation errors:", errors.array());
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  // NEW: read the new fields from the request body
  const { firstName, lastName, mobileNumber, email, password } = req.body;

  console.log("[SIGNUP] Request body:", req.body);

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
    console.log("[SIGNUP] Existing user lookup result:", existingUser);
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "User exists already, please login instead.",
      422
    );
    return next(error);
  }

  // use firstName, lastName, mobileNumber and keep `name` for backwards compatibility
  const createdUser = new User({
    firstName,
    lastName,
    mobileNumber,
    name: `${firstName} ${lastName}`, // old UI components still using `name`
    email,
    image:
      "https://img.freepik.com/free-vector/user-circles-set_78370-4704.jpg?semt=ais_incoming&w=740&q=80",
    password,
    places: [], // new user starts with no places
  });

  try {
    await createdUser.save();
  } catch (err) {
    console.error("[SIGNUP] Saving user failed:", err);

    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  res.status(201).json({ user: createdUser.toObject({ getters: true }) });
};

const login = async (req, res, next) => {
  console.log("[LOGIN] Request body received:", req.body);

  const { email, password } = req.body;
  console.log("[LOGIN] Login attempt for email:", email);

  let existingUser;

  try {
    // ✅ Make sure we are querying by the correct field: email
    existingUser = await User.findOne({ email: email });
    console.log("[LOGIN] User query result:", existingUser);
  } catch (err) {
    console.error("[LOGIN] Error during user lookup:", err);
    const error = new HttpError(
      "Logging in failed, please try again later.",
      500
    );
    return next(error);
  }

  if (!existingUser) {
    console.log("[LOGIN] No user found for this email.");
    const error = new HttpError(
      "Invalid credentials, could not log you in.",
      401
    );
    return next(error);
  }

  if (existingUser.password !== password) {
    console.log("[LOGIN] Password mismatch for email:", email);
    const error = new HttpError(
      "Invalid credentials, could not log you in.",
      401
    );
    return next(error);
  }

  console.log("[LOGIN] Login successful for user:", existingUser.id);

  res.json({
    message: "Logged in!",
    userId: existingUser.id,
    email: existingUser.email,
  });
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;