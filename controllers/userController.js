import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import generateToken from "../data/token.js";
import bcrypt from "bcryptjs";
const DEFAULT_PIC =
  "https://res.cloudinary.com/deylzmzlz/image/upload/v1722320572/chatApp/mouqco9p9gbclbqtoeia.png";

const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const pic = req.file ? req.file.path : DEFAULT_PIC;

  if (!name || !email || !password) {
    console.log("Name, email and password are mandatory");
    return res
      .status(401)
      .json({ message: "Name, email and password are mandatory" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log("User already exists");
    return res.status(401).json({ message: "User already exists" });
  }

  const newUser = await User.create({
    name,
    email,
    password,
    pic,
  });

  if (!newUser) {
    console.log("Error in creating new User");
    return res.status(401).json({ message: "Error in creating new User" });
  }

  const createdUser = await newUser.save();
  if (!createdUser) {
    console.log("Error in saving new user");
    return res.status(401).json({ message: "Error in saving new User" });
  }

  console.log("New user registered successfully");

  const token = generateToken(createdUser._id);
  console.log("Token is ", token);

  return res
    .status(201)
    .json({ message: "New user registered successfully", createdUser, token });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!req.body) {
    console.log("Body is empty");
  }

  if (!email || !password) {
    console.log("Email and password are mandatory");
    return res
      .status(401)
      .json({ message: "Email and password are mandatory" });
  }

  const existingUser = await User.findOne({ email });
  if (!existingUser) {
    console.log("User does not exist");
    return res.status(401).json({ message: "User does not exist" });
  }

  const isGenuine = await bcrypt.compare(password, existingUser.password);
  if (!isGenuine) {
    console.log("Password incorrect");
    return res.status(401).json({ message: "Password incorrect" });
  }

  console.log("User logged in successfully");
  const token = generateToken(existingUser._id);
  console.log("Token is ", token);

  return res
    .status(201)
    .json({ message: "User logged in successfully", existingUser, token });
});

const allUsers = asyncHandler(async (req, res) => {
  const keyword = req.query.search
    ? {
        name: { $regex: `^${req.query.search}`, $options: "i" },
      }
    : {};

  const users = await User.find(keyword).find({ _id: { $ne: req.user._id } });
  if (users.length === 0) {
    console.log("Users could not be found");
    return res
      .status(200)
      .json({ message: "Users could not be found", users: [] });
  }

  console.log("Users found successfully");
  return res.status(200).json({ message: "Users found successfully", users });
});

export { registerUser, login, allUsers };
