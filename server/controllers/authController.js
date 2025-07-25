const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Token = require("../models/UserToken");
require("dotenv").config();
// const { encrypt } = require("../utils/cryptoUtil");

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_KEY,
    { expiresIn: "7d" }
  );
};

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ isSuccess: false, message: errors.array()[0].msg });
    return false;
  }
  return true;
};

exports.register = async (req, res) => {
  if (!handleValidation(req, res)) return;
  const { name, phone, password } = req.body;
  try {
    const existingUser = await User.findOne({ $or: [{ name }, { phone }] });

    if (existingUser) {
      let msg = existingUser.name === name ? "Username already exists! " : "";
      msg += existingUser.phone === phone ? "Phone number already exists!" : "";
      return res.status(400).json({ isSuccess: false, message: msg.trim() });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ name, phone, password: hashedPassword });

    return res.status(201).json({
      isSuccess: true,
      message: "User registered successfully!",
      data: { name, phone },
    });
  } catch (error) {
    return res.status(500).json({ isSuccess: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  if (!handleValidation(req, res)) return;

  const { name, password } = req.body;

  try {
    const user = await User.findOne({ name });
    if (!user || user.role !== "user") {
      throw new Error("Invalid credentials or unauthorized access!");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid password.");

    await Token.deleteMany({ userId: user._id });

    const token = createToken(user);

    await Token.create({ userId: user._id, token });

    // for data encrypt
    // const responseData = {
    //   name: user.name,
    //   phone: user.phone,
    //   user_role: user.role,
    //   id: user._id
    // };

    // const encryptedData = encrypt(JSON.stringify(responseData));

    // return res.status(200).json({
    //   isSuccess: true,
    //   message: "Login successful.",
    //   token,
    //   data: encryptedData
    // });

    return res.status(200).json({
      isSuccess: true,
      message: "Login successful.",
      token,
      data: {
        name: user.name,
        phone: user.phone,
        user_role: user.role,
        id: user._id,
      },
    });
  } catch (error) {
    return res.status(401).json({ isSuccess: false, message: error.message });
  }
};

exports.adminLogin = async (req, res) => {
  if (!handleValidation(req, res)) return;

  // const errors = validationResult(req);
  // if (!errors.isEmpty()) {
  //   return res.status(400).json({ isSuccess: false, message: errors.array()[0].msg });
  // }

  const { name, password } = req.body;

  try {
    const admin = await User.findOne({ name });
    if (!admin || admin.role !== "admin") {
      throw new Error("Unauthorized: admin access only.");
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) throw new Error("Invalid password.");

    await Token.deleteMany({ userId: admin._id });

    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      process.env.JWT_KEY,
      { expiresIn: "7d" }
    );

    await Token.create({ userId: admin._id, token });

    return res.status(200).json({
      isSuccess: true,
      message: "Login successful.",
      token,
      data: {
        name: admin.name,
        phone: admin.phone,
        user_role: admin.role,
        id: admin._id,
      },
    });
  } catch (error) {
    return res.status(401).json({ isSuccess: false, message: error.message });
  }
};

exports.devLogin = async (req, res) => {
  if (!handleValidation(req, res)) return;

  // const errors = validationResult(req);
  // if (!errors.isEmpty()) {
  //   return res.status(400).json({ isSuccess: false, message: errors.array()[0].msg });
  // }

  const { name, password } = req.body;

  try {
    const dev = await User.findOne({ name });
    if (!dev || dev.role !== "developer") {
      throw new Error("Unauthorized: dev access only.");
    }

    const isMatch = await bcrypt.compare(password, dev.password);
    if (!isMatch) throw new Error("Invalid password.");

    await Token.deleteMany({ userId: dev._id });

    const token = jwt.sign(
      { userId: dev._id, role: dev.role },
      process.env.JWT_KEY,
      { expiresIn: "7d" }
    );

    await Token.create({ userId: dev._id, token });

    return res.status(200).json({
      isSuccess: true,
      message: "Login successful.",
      token,
      data: {
        name: dev.name,
        phone: dev.phone,
        user_role: dev.role,
        id: dev._id,
      },
    });
  } catch (error) {
    return res.status(401).json({ isSuccess: false, message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req?.headers?.authorization?.split(" ")?.[1];
    if (token) {
      await Token.deleteOne({ token });
    }
    return res
      .status(200)
      .json({ isSuccess: true, message: "Logout successfully." });
  } catch (error) {
    return res
      .status(500)
      .json({ isSuccess: false, message: "Logout Fail", error });
  }
};
